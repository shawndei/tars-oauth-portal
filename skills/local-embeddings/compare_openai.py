"""
compare_openai.py - Compare Local Embeddings vs OpenAI

This script compares the quality and performance of local embeddings
against OpenAI's text-embedding-3-small model.

Requires:
- Local embeddings (sentence-transformers)
- OpenAI API key (optional, for comparison)

Author: OpenClaw Agent
Date: 2026-02-13
"""

import numpy as np
import time
from typing import List, Tuple, Dict
import json
from pathlib import Path
from local_embeddings import LocalEmbeddingService

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("Warning: OpenAI library not installed. Comparison will be limited.")


class EmbeddingComparison:
    """Compare local and OpenAI embeddings."""
    
    def __init__(self, openai_api_key: str = None):
        """
        Initialize comparison service.
        
        Args:
            openai_api_key: OpenAI API key (optional)
        """
        self.local_service = LocalEmbeddingService()
        
        self.openai_client = None
        if OPENAI_AVAILABLE and openai_api_key:
            self.openai_client = OpenAI(api_key=openai_api_key)
    
    def get_local_embedding(self, text: str) -> np.ndarray:
        """Get embedding from local model."""
        return self.local_service.embed(text, normalize=True)
    
    def get_openai_embedding(self, text: str) -> np.ndarray:
        """Get embedding from OpenAI."""
        if not self.openai_client:
            raise ValueError("OpenAI client not initialized")
        
        response = self.openai_client.embeddings.create(
            input=text,
            model="text-embedding-3-small"
        )
        
        embedding = np.array(response.data[0].embedding)
        # Normalize for fair comparison
        embedding = embedding / np.linalg.norm(embedding)
        return embedding
    
    def compare_similarity_scores(
        self, 
        text_pairs: List[Tuple[str, str]]
    ) -> Dict:
        """
        Compare similarity scores between local and OpenAI embeddings.
        
        Args:
            text_pairs: List of (text1, text2) tuples
        
        Returns:
            Comparison results
        """
        results = []
        
        print("\nComparing similarity scores...")
        print("-" * 70)
        
        for text1, text2 in text_pairs:
            # Local similarity
            local_start = time.time()
            local_sim = self.local_service.similarity(text1, text2)
            local_time = (time.time() - local_start) * 1000
            
            # OpenAI similarity (if available)
            openai_sim = None
            openai_time = None
            
            if self.openai_client:
                try:
                    openai_start = time.time()
                    emb1 = self.get_openai_embedding(text1)
                    emb2 = self.get_openai_embedding(text2)
                    openai_sim = float(np.dot(emb1, emb2))
                    openai_time = (time.time() - openai_start) * 1000
                except Exception as e:
                    print(f"  OpenAI error: {e}")
            
            result = {
                "text1": text1,
                "text2": text2,
                "local_similarity": float(local_sim),
                "local_time_ms": local_time,
                "openai_similarity": float(openai_sim) if openai_sim else None,
                "openai_time_ms": openai_time,
                "difference": float(abs(local_sim - openai_sim)) if openai_sim else None
            }
            
            results.append(result)
            
            # Print comparison
            print(f"'{text1}' ↔ '{text2}'")
            print(f"  Local:  {local_sim:.4f} ({local_time:.1f}ms)")
            if openai_sim:
                print(f"  OpenAI: {openai_sim:.4f} ({openai_time:.1f}ms)")
                print(f"  Δ:      {abs(local_sim - openai_sim):.4f}")
            print()
        
        # Calculate correlation
        if all(r["openai_similarity"] is not None for r in results):
            local_scores = [r["local_similarity"] for r in results]
            openai_scores = [r["openai_similarity"] for r in results]
            
            correlation = np.corrcoef(local_scores, openai_scores)[0, 1]
            
            print(f"Correlation: {correlation:.4f}")
            print("-" * 70)
            
            return {
                "results": results,
                "correlation": float(correlation),
                "avg_difference": float(np.mean([r["difference"] for r in results]))
            }
        
        return {"results": results}
    
    def compare_latency(self, texts: List[str], n_runs: int = 10) -> Dict:
        """
        Compare latency between local and OpenAI embeddings.
        
        Args:
            texts: List of texts to embed
            n_runs: Number of runs for averaging
        
        Returns:
            Latency comparison results
        """
        print("\nComparing latency...")
        print("-" * 70)
        
        # Local latency
        local_times = []
        for _ in range(n_runs):
            for text in texts:
                start = time.time()
                self.local_service.embed(text, use_cache=False)
                local_times.append((time.time() - start) * 1000)
        
        # OpenAI latency
        openai_times = []
        if self.openai_client:
            for _ in range(min(n_runs, 3)):  # Fewer runs to save API calls
                for text in texts:
                    try:
                        start = time.time()
                        self.get_openai_embedding(text)
                        openai_times.append((time.time() - start) * 1000)
                    except Exception as e:
                        print(f"  OpenAI error: {e}")
                        break
        
        local_stats = {
            "avg_ms": float(np.mean(local_times)),
            "median_ms": float(np.median(local_times)),
            "p95_ms": float(np.percentile(local_times, 95)),
            "min_ms": float(np.min(local_times)),
            "max_ms": float(np.max(local_times))
        }
        
        openai_stats = None
        if openai_times:
            openai_stats = {
                "avg_ms": float(np.mean(openai_times)),
                "median_ms": float(np.median(openai_times)),
                "p95_ms": float(np.percentile(openai_times, 95)),
                "min_ms": float(np.min(openai_times)),
                "max_ms": float(np.max(openai_times))
            }
        
        print(f"Local Embeddings:")
        print(f"  Avg:    {local_stats['avg_ms']:.1f}ms")
        print(f"  Median: {local_stats['median_ms']:.1f}ms")
        print(f"  P95:    {local_stats['p95_ms']:.1f}ms")
        
        if openai_stats:
            print(f"\nOpenAI Embeddings:")
            print(f"  Avg:    {openai_stats['avg_ms']:.1f}ms")
            print(f"  Median: {openai_stats['median_ms']:.1f}ms")
            print(f"  P95:    {openai_stats['p95_ms']:.1f}ms")
            
            speedup = openai_stats['avg_ms'] / local_stats['avg_ms']
            print(f"\nLocal is {speedup:.1f}x faster")
        
        print("-" * 70)
        
        return {
            "local": local_stats,
            "openai": openai_stats
        }
    
    def compare_cost(
        self, 
        num_embeddings: int = 1000000,
        openai_price_per_million: float = 0.02
    ) -> Dict:
        """
        Compare costs for generating embeddings.
        
        Args:
            num_embeddings: Number of embeddings to cost
            openai_price_per_million: OpenAI price per 1M tokens
        
        Returns:
            Cost comparison
        """
        print("\nCost Comparison...")
        print("-" * 70)
        
        # OpenAI cost (assuming average 100 tokens per text)
        avg_tokens_per_text = 100
        total_tokens = num_embeddings * avg_tokens_per_text
        openai_cost = (total_tokens / 1_000_000) * openai_price_per_million
        
        # Local cost (hardware depreciation + electricity)
        # Assuming: $500 GPU, 3-year lifespan, 100W power, $0.12/kWh
        hardware_cost_per_year = 500 / 3  # $166/year
        
        # Electricity cost (assuming 24/7 operation)
        power_w = 100
        hours_per_year = 24 * 365
        kwh_per_year = (power_w * hours_per_year) / 1000
        electricity_cost_per_year = kwh_per_year * 0.12  # ~$105/year
        
        total_local_cost_per_year = hardware_cost_per_year + electricity_cost_per_year
        
        # Cost per embedding (assuming 10M embeddings/year)
        embeddings_per_year = 10_000_000
        local_cost_per_embedding = total_local_cost_per_year / embeddings_per_year
        total_local_cost = local_cost_per_embedding * num_embeddings
        
        savings = openai_cost - total_local_cost
        savings_pct = (savings / openai_cost) * 100 if openai_cost > 0 else 0
        
        print(f"For {num_embeddings:,} embeddings:")
        print(f"\nOpenAI:")
        print(f"  Cost: ${openai_cost:.2f}")
        print(f"\nLocal:")
        print(f"  Cost: ${total_local_cost:.4f} (hardware + electricity)")
        print(f"\nSavings:")
        print(f"  Total: ${savings:.2f}")
        print(f"  Percentage: {savings_pct:.1f}%")
        print("-" * 70)
        
        return {
            "num_embeddings": num_embeddings,
            "openai_cost": float(openai_cost),
            "local_cost": float(total_local_cost),
            "savings": float(savings),
            "savings_percentage": float(savings_pct)
        }


def run_comprehensive_comparison(openai_api_key: str = None):
    """Run comprehensive comparison between local and OpenAI embeddings."""
    
    print("=" * 70)
    print("LOCAL vs OPENAI EMBEDDINGS - COMPREHENSIVE COMPARISON")
    print("=" * 70)
    
    comparison = EmbeddingComparison(openai_api_key=openai_api_key)
    
    results = {
        "timestamp": time.time(),
        "model_local": "all-MiniLM-L6-v2",
        "model_openai": "text-embedding-3-small"
    }
    
    # Test 1: Semantic similarity comparison
    print("\n[TEST 1] Semantic Similarity Quality")
    test_pairs = [
        ("cat", "feline"),
        ("car", "automobile"),
        ("happy", "joyful"),
        ("king", "queen"),
        ("python", "programming"),
        ("dog", "puppy"),
        ("fast", "quick"),
        ("ocean", "sea"),
        ("big", "large"),
        ("begin", "start")
    ]
    
    similarity_results = comparison.compare_similarity_scores(test_pairs)
    results["similarity_comparison"] = similarity_results
    
    # Test 2: Latency comparison
    print("\n[TEST 2] Latency Performance")
    test_texts = [
        "This is a test sentence.",
        "Machine learning is fascinating.",
        "Neural networks process information.",
        "Embeddings represent semantic meaning.",
        "AI is transforming technology."
    ]
    
    latency_results = comparison.compare_latency(test_texts, n_runs=10)
    results["latency_comparison"] = latency_results
    
    # Test 3: Cost comparison
    print("\n[TEST 3] Cost Analysis")
    cost_results = comparison.compare_cost(num_embeddings=1_000_000)
    results["cost_comparison"] = cost_results
    
    # Save results
    output_file = Path("skills/local-embeddings/openai_comparison.json")
    with open(output_file, "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n✓ Comparison results saved to {output_file}")
    print("=" * 70)
    
    return results


if __name__ == "__main__":
    import os
    
    # Get OpenAI API key from environment (optional)
    api_key = os.environ.get("OPENAI_API_KEY")
    
    if api_key:
        print("✓ OpenAI API key found - full comparison enabled")
    else:
        print("⚠ No OpenAI API key - running local benchmarks only")
        print("  Set OPENAI_API_KEY environment variable for full comparison")
    
    run_comprehensive_comparison(openai_api_key=api_key)
