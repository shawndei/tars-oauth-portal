"""
Capability Gap Detection - Detect when user requests exceed current tools
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import re


class CapabilityGap:
    """Represents a detected capability gap."""
    
    GAP_TYPES = ["domain-gap", "integration-gap", "complexity-gap", "format-gap", "workflow-gap"]
    
    def __init__(self, gap_type: str, description: str, tool_name: str, requirements: dict, complexity: float):
        self.gap_type = gap_type
        self.description = description
        self.suggested_tool_name = tool_name
        self.requirements = requirements
        self.complexity_score = complexity
        self.detected_at = datetime.now().isoformat()
        self.confidence = 0.0
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "gap_detected": True,
            "gap_type": self.gap_type,
            "missing_capability": self.description,
            "suggested_skill_name": self.suggested_tool_name,
            "tool_requirements": self.requirements,
            "complexity_score": self.complexity_score,
            "confidence": self.confidence,
            "detected_at": self.detected_at
        }


class Intent:
    """Represents extracted user intent."""
    
    def __init__(self, category: str, action: str, entities: List[str], keywords: List[str]):
        self.category = category  # e.g., "data-transform", "monitoring", "automation"
        self.action = action  # e.g., "read", "parse", "convert", "monitor"
        self.entities = entities  # e.g., ["PDF", "CSV", "email"]
        self.keywords = keywords  # Important words from request
    
    def __repr__(self):
        return f"Intent(category={self.category}, action={self.action}, entities={self.entities})"


class CapabilityDetector:
    """
    Detects capability gaps when user requests exceed available tools.
    
    Features:
    - Extract intent from user requests
    - Match against available tools
    - Identify gap type (domain, integration, complexity, etc.)
    - Estimate complexity of solution
    - Suggest tool names and requirements
    """
    
    # Domain keywords for intent extraction
    DOMAIN_KEYWORDS = {
        "data-transform": ["convert", "transform", "parse", "extract", "process", "format"],
        "monitoring": ["monitor", "watch", "track", "observe", "check", "alert"],
        "automation": ["automate", "schedule", "trigger", "run", "execute"],
        "communication": ["send", "email", "message", "notify", "post", "tweet"],
        "file-handling": ["read", "write", "save", "load", "file", "document"],
        "web": ["scrape", "fetch", "download", "crawl", "web", "http"],
        "ai": ["generate", "analyze", "predict", "classify", "summarize"],
        "system": ["command", "shell", "execute", "run", "script"]
    }
    
    # File format keywords
    FILE_FORMATS = ["pdf", "csv", "json", "xml", "yaml", "excel", "docx", "txt", "md"]
    
    def __init__(self, available_tools: List[str] = None):
        self.available_tools = available_tools or []
    
    def extract_intent(self, request: str) -> Intent:
        """
        Extract intent from user request.
        
        Args:
            request: User request text
        
        Returns:
            Intent object
        """
        request_lower = request.lower()
        
        # Extract keywords
        keywords = [word for word in re.findall(r'\b\w+\b', request_lower) if len(word) > 3]
        
        # Detect domain category
        category_scores = {}
        for category, domain_keywords in self.DOMAIN_KEYWORDS.items():
            score = sum(1 for kw in domain_keywords if kw in request_lower)
            if score > 0:
                category_scores[category] = score
        
        category = max(category_scores.items(), key=lambda x: x[1])[0] if category_scores else "general"
        
        # Detect action verbs
        action_verbs = ["read", "write", "convert", "parse", "send", "fetch", "monitor", "run", "create", "delete"]
        action = next((verb for verb in action_verbs if verb in request_lower), "process")
        
        # Detect entities (file formats, technologies)
        entities = []
        for fmt in self.FILE_FORMATS:
            if fmt in request_lower:
                entities.append(fmt.upper())
        
        # Look for tech names
        tech_patterns = [r'\b([A-Z]{2,})\b', r'\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b']
        for pattern in tech_patterns:
            matches = re.findall(pattern, request)
            entities.extend(matches)
        
        return Intent(category, action, list(set(entities)), keywords)
    
    def find_matching_tools(self, intent: Intent, available_tools: List[str]) -> List[dict]:
        """
        Find tools that match the intent.
        
        Args:
            intent: Extracted intent
            available_tools: List of available tool names
        
        Returns:
            List of matching tools with scores
        """
        matches = []
        
        for tool_name in available_tools:
            score = 0.0
            
            # Check if tool name contains intent keywords
            tool_lower = tool_name.lower()
            
            # Match category
            if intent.category in tool_lower:
                score += 0.3
            
            # Match action
            if intent.action in tool_lower:
                score += 0.3
            
            # Match entities
            for entity in intent.entities:
                if entity.lower() in tool_lower:
                    score += 0.2
            
            # Match keywords
            for keyword in intent.keywords:
                if keyword in tool_lower:
                    score += 0.05
            
            if score > 0:
                matches.append({
                    "name": tool_name,
                    "match_score": min(score, 1.0)
                })
        
        return sorted(matches, key=lambda x: x["match_score"], reverse=True)
    
    def detect_gap(self, request: str, available_tools: List[str] = None) -> Dict[str, Any]:
        """
        Detect capability gap for a user request.
        
        Args:
            request: User request text
            available_tools: List of available tools (None = use self.available_tools)
        
        Returns:
            Gap detection result dictionary
        """
        if available_tools is None:
            available_tools = self.available_tools
        
        # Extract intent
        intent = self.extract_intent(request)
        
        # Find matching tools
        matches = self.find_matching_tools(intent, available_tools)
        
        # Check if perfect match exists
        if matches and matches[0]["match_score"] > 0.85:
            return {
                "gap_detected": False,
                "reason": f"Matching tool exists: {matches[0]['name']}",
                "best_match": matches[0]
            }
        
        # No perfect match - there's a gap
        gap = self._characterize_gap(intent, matches)
        
        return gap.to_dict()
    
    def _characterize_gap(self, intent: Intent, matches: List[dict]) -> CapabilityGap:
        """
        Characterize the type and nature of the capability gap.
        
        Args:
            intent: Extracted intent
            matches: Close matching tools
        
        Returns:
            CapabilityGap object
        """
        # Determine gap type
        if not matches or matches[0]["match_score"] < 0.3:
            gap_type = "domain-gap"
            description = f"No existing tool handles {intent.category} operations"
        elif len(intent.entities) > 1 and matches[0]["match_score"] < 0.5:
            gap_type = "integration-gap"
            description = f"Need to combine {', '.join(intent.entities)} handling"
        elif matches and matches[0]["match_score"] > 0.5:
            gap_type = "complexity-gap"
            description = f"Existing {matches[0]['name']} tool insufficient for advanced {intent.action} operations"
        else:
            gap_type = "format-gap"
            description = f"Need different format handling for {intent.entities[0] if intent.entities else intent.category}"
        
        # Generate suggested tool name
        tool_name = self._generate_tool_name(intent)
        
        # Derive requirements
        requirements = self._derive_requirements(intent, gap_type)
        
        # Estimate complexity
        complexity = self._estimate_complexity(intent, gap_type)
        
        gap = CapabilityGap(
            gap_type=gap_type,
            description=description,
            tool_name=tool_name,
            requirements=requirements,
            complexity=complexity
        )
        
        # Calculate confidence
        gap.confidence = self._calculate_confidence(matches)
        
        return gap
    
    def _generate_tool_name(self, intent: Intent) -> str:
        """Generate suggested tool name from intent."""
        # Use category + main entity or action
        if intent.entities:
            name = f"{intent.entities[0].lower()}-{intent.action}er"
        else:
            name = f"{intent.category}-{intent.action}er"
        
        # Clean up
        name = name.replace("__", "-").replace(" ", "-")
        
        return name
    
    def _derive_requirements(self, intent: Intent, gap_type: str) -> dict:
        """Derive tool requirements from intent."""
        # Generate function names
        core_functions = [
            f"{intent.action}_{entity.lower()}" for entity in intent.entities
        ] if intent.entities else [
            f"{intent.action}_data",
            f"process_{intent.category}"
        ]
        
        # Limit to 3-5 functions
        core_functions = core_functions[:5]
        
        # Add common functions
        if gap_type != "format-gap":
            core_functions.append("validate_input")
        
        requirements = {
            "core_functions": core_functions,
            "input_format": "dict",
            "output_format": "dict",
            "dependencies": intent.entities[:3],  # Limit dependencies
            "success_criteria": [
                f"Successfully {intent.action}s {entity}" for entity in intent.entities[:2]
            ] if intent.entities else [
                f"Handles {intent.category} operations correctly"
            ]
        }
        
        return requirements
    
    def _estimate_complexity(self, intent: Intent, gap_type: str) -> float:
        """
        Estimate complexity score (1-10) for implementing the solution.
        
        Factors:
        - Number of entities: more entities = more complex
        - Gap type: domain-gap more complex than format-gap
        - Number of required functions
        """
        complexity = 5.0  # Base complexity
        
        # Gap type adjustment
        gap_complexity = {
            "domain-gap": 2.0,
            "integration-gap": 1.5,
            "complexity-gap": 1.0,
            "format-gap": -1.0,
            "workflow-gap": 1.5
        }
        complexity += gap_complexity.get(gap_type, 0)
        
        # Entity count adjustment
        complexity += len(intent.entities) * 0.5
        
        # Keyword density adjustment (more keywords = more complex)
        if len(intent.keywords) > 10:
            complexity += 1.0
        
        # Clamp to 1-10 range
        complexity = max(1.0, min(10.0, complexity))
        
        return round(complexity, 1)
    
    def _calculate_confidence(self, matches: List[dict]) -> float:
        """
        Calculate confidence in gap detection.
        
        High confidence when:
        - No close matches exist
        - Clear intent extracted
        
        Low confidence when:
        - Close matches exist (might be false positive)
        """
        if not matches:
            return 0.95  # High confidence - no matches at all
        
        best_score = matches[0]["match_score"]
        
        if best_score < 0.2:
            return 0.9  # High confidence
        elif best_score < 0.5:
            return 0.7  # Medium confidence
        else:
            return 0.5  # Low confidence (close match exists)


# Convenience function
def detect_capability_gap(request: str, available_tools: List[str] = None) -> Dict[str, Any]:
    """
    Detect capability gap for a user request.
    
    Args:
        request: User request text
        available_tools: List of available tool names
    
    Returns:
        Gap detection result dictionary
    """
    detector = CapabilityDetector(available_tools or [])
    return detector.detect_gap(request)
