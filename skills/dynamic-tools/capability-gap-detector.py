#!/usr/bin/env python3
"""
Capability Gap Detection System

Identifies when user requests exceed current tool capabilities and
characterizes the type of gap for tool generation.
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Tuple
from datetime import datetime
import re


class CapabilityGapDetector:
    """
    Analyzes user requests against available tools and detects capability gaps.
    """
    
    def __init__(self, skills_path: str = "skills"):
        """
        Initialize detector with path to skills directory.
        
        Args:
            skills_path: Path to skills directory
        """
        self.skills_path = skills_path
        self.available_skills = self._load_available_skills()
    
    def _load_available_skills(self) -> Dict[str, Dict]:
        """
        Load metadata about all available skills.
        
        Returns:
            Dict mapping skill names to their descriptions and capabilities
        """
        skills = {}
        
        if not Path(self.skills_path).exists():
            return skills
        
        for skill_dir in Path(self.skills_path).iterdir():
            if not skill_dir.is_dir():
                continue
            
            skill_md = skill_dir / "SKILL.md"
            if skill_md.exists():
                skill_name = skill_dir.name
                
                # Extract description from frontmatter
                description = self._extract_description(skill_md)
                
                # Extract capabilities from SKILL.md
                capabilities = self._extract_capabilities(skill_md)
                
                skills[skill_name] = {
                    "path": str(skill_dir),
                    "description": description,
                    "capabilities": capabilities,
                    "keywords": self._extract_keywords(description, capabilities)
                }
        
        return skills
    
    def _extract_description(self, skill_md_path: Path) -> str:
        """Extract description from SKILL.md frontmatter."""
        try:
            with open(skill_md_path, 'r') as f:
                content = f.read()
                
                # Extract description from YAML frontmatter
                match = re.search(r'description:\s*(.+?)(?:\n|$)', content)
                if match:
                    return match.group(1).strip('"').strip("'")
                
                return ""
        except:
            return ""
    
    def _extract_capabilities(self, skill_md_path: Path) -> List[str]:
        """Extract capability descriptions from SKILL.md."""
        capabilities = []
        
        try:
            with open(skill_md_path, 'r') as f:
                content = f.read()
                
                # Extract capabilities section
                if "## Core Capabilities" in content:
                    cap_start = content.find("## Core Capabilities") + len("## Core Capabilities")
                    cap_end = content.find("##", cap_start)
                    cap_section = content[cap_start:cap_end]
                    
                    # Extract bullet points
                    lines = cap_section.split('\n')
                    for line in lines:
                        line = line.strip()
                        if line.startswith('-'):
                            capabilities.append(line[1:].strip())
                
                return capabilities[:10]  # Limit to first 10
        except:
            return []
    
    def _extract_keywords(self, description: str, capabilities: List[str]) -> List[str]:
        """Extract searchable keywords from description and capabilities."""
        keywords = []
        
        # Extract from description
        words = description.lower().split()
        keywords.extend(words[:10])
        
        # Extract from capabilities
        for cap in capabilities:
            words = cap.lower().split()
            keywords.extend(words[:5])
        
        # Remove common words
        common = {'the', 'a', 'an', 'and', 'or', 'is', 'are', 'to', 'for', 'with'}
        keywords = [w for w in keywords if w not in common and len(w) > 2]
        
        return list(set(keywords))[:20]
    
    def detect_gap(self, user_request: str, threshold: float = 0.5) -> Dict:
        """
        Analyze user request for capability gaps.
        
        Args:
            user_request: User's request text
            threshold: Match threshold (0-1) for considering tool sufficient
        
        Returns:
            Dict with gap detection results
        """
        
        # Step 1: Extract intent from request
        intent = self._extract_intent(user_request)
        
        # Step 2: Find matching tools
        matches = self._find_matching_skills(intent)
        
        # Step 3: Determine if gap exists
        best_match = matches[0] if matches else None
        
        gap_detected = (
            best_match is None or 
            best_match['match_score'] < threshold
        )
        
        # Step 4: Characterize the gap
        if gap_detected:
            gap_type = self._classify_gap(user_request, intent, matches)
        else:
            gap_type = None
        
        return {
            "gap_detected": gap_detected,
            "intent": intent,
            "best_match": best_match,
            "close_matches": matches[:3],
            "gap_type": gap_type,
            "missing_capability": self._describe_gap(user_request, intent, matches),
            "complexity_score": self._estimate_complexity(user_request, intent),
            "suggested_skill_name": self._suggest_skill_name(intent),
            "confidence": best_match['match_score'] if best_match else 0.0,
            "timestamp": datetime.now().isoformat()
        }
    
    def _extract_intent(self, request: str) -> str:
        """
        Extract core intent from user request.
        
        Examples:
            "Read PDF files" → "document-reading"
            "Send me emails" → "email-automation"
            "Monitor system health" → "system-monitoring"
        """
        request_lower = request.lower()
        
        # Intent patterns (domain -> keywords)
        intent_patterns = {
            "document-processing": ["pdf", "document", "text", "extract", "parse"],
            "email-automation": ["email", "send", "mail", "message"],
            "data-transformation": ["transform", "convert", "format", "restructure", "csv", "json"],
            "web-scraping": ["scrape", "crawl", "website", "fetch", "download"],
            "system-monitoring": ["monitor", "health", "status", "watch", "check"],
            "task-automation": ["automate", "schedule", "task", "cron", "recurring"],
            "reporting": ["report", "analyze", "summary", "statistics", "aggregate"],
            "integration": ["connect", "integrate", "sync", "combine", "orchestrate"],
            "file-handling": ["file", "directory", "upload", "download", "storage"],
            "image-processing": ["image", "photo", "picture", "visual", "qr", "barcode"],
        }
        
        # Find best matching intent
        best_intent = "generic-tool"
        best_count = 0
        
        for intent, keywords in intent_patterns.items():
            count = sum(1 for kw in keywords if kw in request_lower)
            if count > best_count:
                best_count = count
                best_intent = intent
        
        return best_intent
    
    def _find_matching_skills(self, intent: str) -> List[Dict]:
        """
        Find skills that match the extracted intent.
        
        Returns:
            List of matching skills with match scores, sorted by relevance
        """
        matches = []
        
        for skill_name, skill_info in self.available_skills.items():
            # Calculate match score based on keywords
            request_keywords = set(intent.split('-'))
            skill_keywords = set(skill_info['keywords'])
            
            # Jaccard similarity
            intersection = len(request_keywords & skill_keywords)
            union = len(request_keywords | skill_keywords)
            match_score = intersection / union if union > 0 else 0
            
            if match_score > 0:
                matches.append({
                    "skill_name": skill_name,
                    "description": skill_info['description'],
                    "match_score": match_score,
                    "capabilities": skill_info['capabilities']
                })
        
        # Sort by match score
        matches.sort(key=lambda x: x['match_score'], reverse=True)
        
        return matches
    
    def _classify_gap(self, request: str, intent: str, matches: List[Dict]) -> str:
        """
        Classify the type of capability gap.
        
        Gap Types:
        - domain-gap: User wants capability in entirely new domain
        - integration-gap: Want to combine existing tools in new way
        - complexity-gap: Existing tool too simple for request
        - format-gap: Different input/output format needed
        - workflow-gap: Multi-step workflow across existing tools
        """
        
        request_lower = request.lower()
        
        # No matches at all = domain gap
        if not matches:
            return "domain-gap"
        
        best_match = matches[0]
        match_score = best_match['match_score']
        
        # Close match but request asks for more = complexity gap
        if 0.5 < match_score < 0.8:
            if any(word in request_lower for word in ["advanced", "complex", "custom", "special"]):
                return "complexity-gap"
        
        # Multiple tool names mentioned = integration gap
        if request_lower.count(" and ") > 0 or request_lower.count(",") > 1:
            return "integration-gap"
        
        # Asking for specific format = format gap
        if any(fmt in request_lower for fmt in ["json", "csv", "xml", "yaml", "markdown"]):
            if match_score > 0.3:
                return "format-gap"
        
        # Multi-step or scheduled = workflow gap
        if any(word in request_lower for word in ["workflow", "pipeline", "schedule", "daily", "weekly"]):
            return "workflow-gap"
        
        # Default: domain gap for low matches
        return "domain-gap"
    
    def _describe_gap(self, request: str, intent: str, matches: List[Dict]) -> str:
        """Generate human-readable description of the capability gap."""
        
        if not matches or matches[0]['match_score'] < 0.5:
            return f"No existing tool for: {intent.replace('-', ' ')}"
        
        best_match = matches[0]
        return f"Need enhancement to '{best_match['skill_name']}' skill for: {intent.replace('-', ' ')}"
    
    def _estimate_complexity(self, request: str, intent: str) -> float:
        """
        Estimate complexity of building a tool for this request (1-10 scale).
        
        Factors:
        - Requires external API/library (adds 2-3 points)
        - Requires file I/O (adds 1-2 points)
        - Requires data processing (adds 2-3 points)
        - Requires scheduling/async (adds 2 points)
        - Base complexity: 2 points
        """
        
        complexity = 2.0  # Base
        request_lower = request.lower()
        
        # Check for complexity indicators
        api_keywords = ["api", "service", "external", "integration", "http", "request"]
        if any(kw in request_lower for kw in api_keywords):
            complexity += 2.5
        
        file_keywords = ["file", "upload", "download", "storage", "directory"]
        if any(kw in request_lower for kw in file_keywords):
            complexity += 1.5
        
        data_keywords = ["parse", "transform", "convert", "process", "analyze", "aggregate"]
        if any(kw in request_lower for kw in data_keywords):
            complexity += 2.5
        
        async_keywords = ["schedule", "recurring", "daily", "weekly", "batch", "watch"]
        if any(kw in request_lower for kw in async_keywords):
            complexity += 2.0
        
        ml_keywords = ["ai", "machine learning", "nlp", "predict", "classify"]
        if any(kw in request_lower for kw in ml_keywords):
            complexity += 3.0
        
        # Cap at 10
        return min(complexity, 10.0)
    
    def _suggest_skill_name(self, intent: str) -> str:
        """
        Suggest a skill name based on intent.
        
        Examples:
            "document-processing" → "document-processor"
            "email-automation" → "email-orchestrator"
        """
        
        # Remove common suffix
        name = intent.replace("-", " ")
        
        # Add appropriate suffix
        if "processing" not in name and "handler" not in name:
            name += " processor"
        
        return name.replace(" ", "-").lower()


def test_capability_detector():
    """
    Test the capability gap detector with example requests.
    """
    
    detector = CapabilityGapDetector()
    
    test_requests = [
        "Can you read and extract text from PDF files?",
        "I need to process CSV files with custom transformations",
        "Send me email summaries of web search results daily",
        "Monitor my system's CPU and memory usage",
        "Convert images to QR codes",
        "I want to orchestrate multiple tools in a workflow"
    ]
    
    print("=" * 80)
    print("CAPABILITY GAP DETECTION TEST")
    print("=" * 80)
    
    for request in test_requests:
        result = detector.detect_gap(request)
        
        print(f"\nRequest: {request}")
        print(f"  Intent: {result['intent']}")
        print(f"  Gap Detected: {result['gap_detected']}")
        
        if result['gap_detected']:
            print(f"  Gap Type: {result['gap_type']}")
            print(f"  Complexity: {result['complexity_score']:.1f}/10")
            print(f"  Suggested Tool: {result['suggested_skill_name']}")
            print(f"  Missing: {result['missing_capability']}")
        else:
            if result['best_match']:
                print(f"  ✓ Can use: {result['best_match']['skill_name']}")
                print(f"  Confidence: {result['best_match']['match_score']:.1%}")
        
        if result['close_matches']:
            print(f"  Close matches:")
            for match in result['close_matches'][:2]:
                print(f"    - {match['skill_name']} ({match['match_score']:.1%})")


if __name__ == "__main__":
    test_capability_detector()
