"""
test_embeddings.py - Comprehensive Test Suite for Local Embeddings

Tests:
1. Unit tests (shape, consistency, caching)
2. Performance benchmarks (latency, throughput)
3. Quality comparison vs OpenAI
4. Integration tests (RAG, similarity search)

Author: OpenClaw Agent
Date: 2026-02-13
"""

import pytest
import numpy as np
import time
from pathlib import Path
import json
from typing import List, Dict
from local_embeddings import LocalEmbeddingService, OpenAICompatibleEmbeddings


class TestBasicFunctionality:
    """Basic unit tests for embedding service."""
    
    def setup_method(self):
        """Setup test service."""
        self.service = LocalEmbeddingService(cache_dir="./cache/test_embeddings")
    
    def test_embedding_shape(self):
        """Test that embeddings have correct dimensions."""
        emb = self.service.embed("test text")
        
        assert isinstance(emb, np.ndarray)
        assert emb.shape == (384,)  # all-MiniLM-L6-v2 has 384 dimensions
        assert emb.dtype == np.float32 or emb.dtype == np.float64
    
    def test_batch_consistency(self):
        """Test that batch embeddings match individual embeddings."""
        texts = ["hello world", "goodbye moon"]
        
        # Individual embeddings
        emb1 = self.service.embed(texts[0], use_cache=False)
        emb2 = self.service.embed(texts[1], use_cache=False)
        
        # Batch embeddings
        batch_embs = self.service.embed_batch(texts, show_progress=False)
        
        # Should be identical (within floating point tolerance)
        np.testing.assert_allclose(emb1, batch_embs[0], rtol=1e-5)
        np.testing.assert_allclose(emb2, batch_embs[1], rtol=1e-5)
    
    def test_normalization(self):
        """Test that normalized embeddings have unit length."""
        emb = self.service.embed("test text", normalize=True)
        
        # Normalized vectors should have length ~1.0
        magnitude = np.linalg.norm(emb)
        assert abs(magnitude - 1.0) < 1e-5
    
    def test_similarity_range(self):
        """Test that similarity scores are in valid range."""
        sim = self.service.similarity("cat", "dog")
        assert 0.0 <= sim <= 1.0
        
        # Self-similarity should be ~1.0
        self_sim = self.service.similarity("test", "test")
        assert self_sim > 0.99
        
        # Completely different texts should have lower similarity
        diff_sim = self.service.similarity("hello", "12345")
        assert diff_sim < 0.9
    
    def test_cache_functionality(self):
        """Test that caching works correctly."""
        text = "cache test text"
        
        # Clear cache first
        self.service.clear_cache()
        
        # First call should miss cache
        emb1 = self.service.embed(text, use_cache=True)
        stats1 = self.service.get_stats()
        
        # Second call should hit cache
        emb2 = self.service.embed(text, use_cache=True)
        stats2 = self.service.get_stats()
        
        # Embeddings should be identical
        np.testing.assert_array_equal(emb1, emb2)
        
        # Cache hits should increase
        assert stats2["cache_hits"] > stats1["cache_hits"]
    
    def test_cache_performance(self):
        """Test that caching improves performance."""
        text = "cache performance test"
        
        # Clear cache
        self.service.clear_cache()
        
        # First call (no cache)
        start = time.time()
        self.service.embed(text, use_cache=True)
        uncached_time = time.time() - start
        
        # Second call (cached)
        start = time.time()
        self.service.embed(text, use_cache=True)
        cached_time = time.time() - start
        
        # Cache should be significantly faster (at least 5x)
        assert cached_time < uncached_time / 5
    
    def test_batch_size_consistency(self):
        """Test that different batch sizes give same results."""
        texts = [f"text {i}" for i in range(10)]
        
        # Different batch sizes
        embs_bs2 = self.service.embed_batch(texts, batch_size=2, show_progress=False)
        embs_bs5 = self.service.embed_batch(texts, batch_size=5, show_progress=False)
        
        # Results should be identical
        np.testing.assert_allclose(embs_bs2, embs_bs5, rtol=1e-5)
    
    def test_empty_text(self):
        """Test handling of empty text."""
        emb = self.service.embed("")
        
        # Should still return valid embedding
        assert emb.shape == (384,)
        assert not np.any(np.isnan(emb))
    
    def test_long_text(self):
        """Test handling of long text (>512 tokens)."""
        long_text = " ".join(["word"] * 1000)
        
        emb = self.service.embed(long_text)
        
        # Should still return valid embedding
        assert emb.shape == (384,)
        assert not np.any(np.isnan(emb))


class TestPerformance:
    """Performance benchmarks for embedding service."""
    
    def setup_method(self):
        """Setup test service."""
        self.service = LocalEmbeddingService(cache_dir="./cache/test_embeddings")
        # Warm up model
        self.service.embed("warmup")
    
    def test_latency_requirement(self):
        """Test that embeddings meet <100ms requirement."""
        times = []
        
        for i in range(10):
            text = f"test text {i}"
            start = time.time()
            self.service.embed(text, use_cache=False)
            elapsed = (time.time() - start) * 1000
            times.append(elapsed)
        
        avg_time = np.mean(times)
        max_time = np.max(times)
        
        print(f"\n  Latency: avg={avg_time:.1f}ms, max={max_time:.1f}ms")
        
        # Average should be well under 100ms
        assert avg_time < 100, f"Average latency {avg_time:.1f}ms exceeds 100ms"
        
        # Even worst case should be under 150ms
        assert max_time < 150, f"Max latency {max_time:.1f}ms exceeds 150ms"
    
    def test_batch_efficiency(self):
        """Test that batch processing is more efficient."""
        texts = [f"text {i}" for i in range(50)]
        
        # Individual embeddings
        start = time.time()
        for text in texts:
            self.service.embed(text, use_cache=False)
        individual_time = time.time() - start
        
        # Clear cache
        self.service.clear_cache()
        
        # Batch embedding
        start = time.time()
        self.service.embed_batch(texts, batch_size=32, show_progress=False)
        batch_time = time.time() - start
        
        speedup = individual_time / batch_time
        
        print(f"\n  Individual: {individual_time:.2f}s")
        print(f"  Batch: {batch_time:.2f}s")
        print(f"  Speedup: {speedup:.1f}x")
        
        # Batch should be at least 2x faster
        assert speedup > 2.0, f"Batch speedup {speedup:.1f}x is too low"
    
    def test_throughput(self):
        """Test embedding throughput (texts per second)."""
        n_texts = 100
        texts = [f"text number {i}" for i in range(n_texts)]
        
        start = time.time()
        self.service.embed_batch(texts, batch_size=32, show_progress=False)
        elapsed = time.time() - start
        
        throughput = n_texts / elapsed
        
        print(f"\n  Throughput: {throughput:.1f} texts/sec")
        
        # Should handle at least 50 texts per second
        assert throughput > 50, f"Throughput {throughput:.1f} texts/sec is too low"
    
    def test_large_batch(self):
        """Test handling of large batch (1000+ texts)."""
        n_texts = 1000
        texts = [f"document {i}" for i in range(n_texts)]
        
        start = time.time()
        embeddings = self.service.embed_batch(
            texts, 
            batch_size=64, 
            show_progress=False
        )
        elapsed = time.time() - start
        
        print(f"\n  {n_texts} texts in {elapsed:.2f}s")
        print(f"  Per-text: {elapsed/n_texts*1000:.1f}ms")
        
        # Verify all embeddings generated
        assert embeddings.shape == (n_texts, 384)
        
        # Should complete in reasonable time (<30 seconds)
        assert elapsed < 30, f"Large batch took {elapsed:.1f}s (>30s)"


class TestSemanticQuality:
    """Test semantic understanding quality."""
    
    def setup_method(self):
        """Setup test service."""
        self.service = LocalEmbeddingService(cache_dir="./cache/test_embeddings")
    
    def test_synonyms(self):
        """Test that synonyms have high similarity."""
        synonym_pairs = [
            ("car", "automobile", 0.80),
            ("happy", "joyful", 0.75),
            ("big", "large", 0.80),
            ("begin", "start", 0.75),
            ("quick", "fast", 0.80)
        ]
        
        print("\n  Synonym Similarities:")
        for word1, word2, min_threshold in synonym_pairs:
            sim = self.service.similarity(word1, word2)
            print(f"    '{word1}' ↔ '{word2}': {sim:.3f} (min: {min_threshold})")
            assert sim >= min_threshold, \
                f"Synonym similarity {sim:.3f} below threshold {min_threshold}"
    
    def test_antonyms(self):
        """Test that antonyms have lower similarity."""
        antonym_pairs = [
            ("happy", "sad", 0.5),
            ("hot", "cold", 0.5),
            ("good", "bad", 0.5),
            ("love", "hate", 0.6)  # These can be semantically related
        ]
        
        print("\n  Antonym Similarities:")
        for word1, word2, max_threshold in antonym_pairs:
            sim = self.service.similarity(word1, word2)
            print(f"    '{word1}' ↔ '{word2}': {sim:.3f} (max: {max_threshold})")
            assert sim <= max_threshold, \
                f"Antonym similarity {sim:.3f} above threshold {max_threshold}"
    
    def test_semantic_categories(self):
        """Test that semantically similar texts cluster together."""
        # Define categories
        animals = ["cat", "dog", "elephant", "lion"]
        fruits = ["apple", "banana", "orange", "grape"]
        
        # Test that within-category similarity > across-category
        cat_emb = self.service.embed("cat")
        
        # Similarities to other animals
        animal_sims = [
            self.service.similarity("cat", animal) 
            for animal in animals[1:]
        ]
        
        # Similarities to fruits
        fruit_sims = [
            self.service.similarity("cat", fruit) 
            for fruit in fruits
        ]
        
        avg_animal = np.mean(animal_sims)
        avg_fruit = np.mean(fruit_sims)
        
        print(f"\n  Category Clustering:")
        print(f"    cat → animals: {avg_animal:.3f}")
        print(f"    cat → fruits: {avg_fruit:.3f}")
        
        # Within-category should be more similar
        assert avg_animal > avg_fruit, \
            "Within-category similarity not higher than across-category"
    
    def test_semantic_search(self):
        """Test semantic search quality."""
        query = "How to train a neural network?"
        
        documents = [
            "Neural network training requires labeled data and backpropagation",
            "Cookie recipes for chocolate chip cookies",
            "Training deep learning models on GPU clusters",
            "Gardening tips for growing tomatoes",
            "Machine learning model optimization techniques"
        ]
        
        results = self.service.find_similar(query, documents, top_k=3)
        
        print(f"\n  Semantic Search Results:")
        print(f"    Query: '{query}'")
        for res in results:
            print(f"    {res['rank']}. [{res['score']:.3f}] {res['text'][:50]}...")
        
        # Top result should be about neural network training
        assert "neural network training" in results[0]["text"].lower(), \
            "Top result not semantically relevant"
        
        # Top result should have high score (>0.5)
        assert results[0]["score"] > 0.5, \
            f"Top result score {results[0]['score']:.3f} too low"


class TestOpenAICompatibility:
    """Test OpenAI-compatible API."""
    
    def setup_method(self):
        """Setup test embeddings."""
        self.embeddings = OpenAICompatibleEmbeddings()
    
    def test_single_text(self):
        """Test single text embedding."""
        response = self.embeddings.create(input="Hello world")
        
        assert response["object"] == "list"
        assert len(response["data"]) == 1
        assert response["data"][0]["object"] == "embedding"
        assert isinstance(response["data"][0]["embedding"], list)
        assert len(response["data"][0]["embedding"]) == 384
    
    def test_multiple_texts(self):
        """Test multiple text embeddings."""
        texts = ["text one", "text two", "text three"]
        response = self.embeddings.create(input=texts)
        
        assert len(response["data"]) == 3
        
        for idx, item in enumerate(response["data"]):
            assert item["index"] == idx
            assert len(item["embedding"]) == 384
    
    def test_usage_field(self):
        """Test that usage field is populated."""
        response = self.embeddings.create(input="test text")
        
        assert "usage" in response
        assert "prompt_tokens" in response["usage"]
        assert "total_tokens" in response["usage"]


class TestRAGIntegration:
    """Test RAG (Retrieval Augmented Generation) integration."""
    
    def setup_method(self):
        """Setup test service."""
        self.service = LocalEmbeddingService(cache_dir="./cache/test_embeddings")
    
    def test_document_retrieval(self):
        """Test retrieving relevant documents for a query."""
        # Create a small knowledge base
        knowledge_base = [
            {
                "id": 1,
                "text": "Python is a high-level programming language known for readability"
            },
            {
                "id": 2,
                "text": "Machine learning models learn patterns from training data"
            },
            {
                "id": 3,
                "text": "Neural networks consist of layers of interconnected nodes"
            },
            {
                "id": 4,
                "text": "JavaScript is used for web development and browser scripting"
            },
            {
                "id": 5,
                "text": "Deep learning uses multiple layers to extract features from data"
            }
        ]
        
        # Embed all documents
        texts = [doc["text"] for doc in knowledge_base]
        doc_embeddings = self.service.embed_batch(texts)
        
        # Query for machine learning content
        query = "What is deep learning?"
        query_emb = self.service.embed(query)
        
        # Compute similarities
        similarities = doc_embeddings @ query_emb
        
        # Get top 3 results
        top_indices = np.argsort(similarities)[::-1][:3]
        
        print("\n  RAG Retrieval Results:")
        print(f"    Query: '{query}'")
        for rank, idx in enumerate(top_indices):
            print(f"    {rank+1}. [{similarities[idx]:.3f}] ID={knowledge_base[idx]['id']}")
        
        # Top result should be about deep learning (id=5)
        assert knowledge_base[top_indices[0]]["id"] == 5, \
            "Failed to retrieve most relevant document"
        
        # Top 3 should include machine learning (id=2) and neural networks (id=3)
        top_3_ids = {knowledge_base[idx]["id"] for idx in top_indices}
        assert 2 in top_3_ids or 3 in top_3_ids, \
            "Related documents not in top 3"
    
    def test_multi_query_retrieval(self):
        """Test retrieving documents for multiple queries efficiently."""
        documents = [f"Document about topic {i}" for i in range(100)]
        queries = [f"Query about topic {i}" for i in range(5)]
        
        # Embed all at once
        doc_embs = self.service.embed_batch(documents, show_progress=False)
        query_embs = self.service.embed_batch(queries, show_progress=False)
        
        # Compute all similarities at once
        similarities = query_embs @ doc_embs.T  # (5, 100)
        
        assert similarities.shape == (5, 100)
        
        # Get top result for each query
        top_indices = np.argmax(similarities, axis=1)
        
        assert len(top_indices) == 5


def run_benchmark_suite():
    """Run comprehensive benchmark suite and save results."""
    print("\n" + "=" * 60)
    print("LOCAL EMBEDDING SERVICE - BENCHMARK SUITE")
    print("=" * 60)
    
    results = {
        "timestamp": time.time(),
        "model": "all-MiniLM-L6-v2",
        "benchmarks": {}
    }
    
    service = LocalEmbeddingService(cache_dir="./cache/test_embeddings")
    
    # Benchmark 1: Single embedding latency
    print("\n[1/5] Single Embedding Latency")
    service.embed("warmup")  # Warm up
    times = []
    for i in range(100):
        text = f"test text {i}"
        start = time.time()
        service.embed(text, use_cache=False)
        times.append((time.time() - start) * 1000)
    
    results["benchmarks"]["single_embedding"] = {
        "avg_ms": float(np.mean(times)),
        "median_ms": float(np.median(times)),
        "p95_ms": float(np.percentile(times, 95)),
        "max_ms": float(np.max(times))
    }
    print(f"  Avg: {np.mean(times):.1f}ms")
    print(f"  P95: {np.percentile(times, 95):.1f}ms")
    
    # Benchmark 2: Batch processing
    print("\n[2/5] Batch Processing Efficiency")
    batch_sizes = [1, 10, 50, 100, 500]
    batch_results = []
    
    for batch_size in batch_sizes:
        texts = [f"text {i}" for i in range(batch_size)]
        start = time.time()
        service.embed_batch(texts, show_progress=False)
        elapsed = time.time() - start
        
        per_text_ms = (elapsed / batch_size) * 1000
        throughput = batch_size / elapsed
        
        batch_results.append({
            "batch_size": batch_size,
            "total_time_s": elapsed,
            "per_text_ms": per_text_ms,
            "throughput": throughput
        })
        
        print(f"  Batch {batch_size:3d}: {per_text_ms:5.1f}ms/text, {throughput:6.1f} texts/sec")
        
        service.clear_cache()
    
    results["benchmarks"]["batch_processing"] = batch_results
    
    # Benchmark 3: Cache performance
    print("\n[3/5] Cache Performance")
    service.clear_cache()
    
    test_texts = [f"cached text {i}" for i in range(10)]
    
    # Uncached
    start = time.time()
    for text in test_texts * 10:  # 100 embeddings
        service.embed(text, use_cache=False)
    uncached_time = time.time() - start
    
    # Cached
    for text in test_texts:
        service.embed(text, use_cache=True)
    
    start = time.time()
    for text in test_texts * 10:  # 100 embeddings
        service.embed(text, use_cache=True)
    cached_time = time.time() - start
    
    speedup = uncached_time / cached_time
    
    results["benchmarks"]["cache"] = {
        "uncached_time_s": uncached_time,
        "cached_time_s": cached_time,
        "speedup": speedup
    }
    
    print(f"  Uncached: {uncached_time:.3f}s")
    print(f"  Cached: {cached_time:.3f}s")
    print(f"  Speedup: {speedup:.1f}x")
    
    # Benchmark 4: Semantic quality
    print("\n[4/5] Semantic Quality")
    test_pairs = [
        ("car", "automobile"),
        ("happy", "joyful"),
        ("king", "queen"),
        ("python", "programming"),
        ("cat", "feline")
    ]
    
    similarities = []
    for text1, text2 in test_pairs:
        sim = service.similarity(text1, text2)
        similarities.append(sim)
        print(f"  '{text1}' ↔ '{text2}': {sim:.3f}")
    
    results["benchmarks"]["semantic_quality"] = {
        "test_pairs": [{"text1": t1, "text2": t2, "similarity": float(s)} 
                       for (t1, t2), s in zip(test_pairs, similarities)],
        "avg_similarity": float(np.mean(similarities))
    }
    
    # Benchmark 5: Large scale test
    print("\n[5/5] Large Scale Test (1000 embeddings)")
    texts = [f"document {i} with some content" for i in range(1000)]
    
    start = time.time()
    embeddings = service.embed_batch(texts, batch_size=64, show_progress=False)
    elapsed = time.time() - start
    
    results["benchmarks"]["large_scale"] = {
        "num_texts": 1000,
        "total_time_s": elapsed,
        "per_text_ms": (elapsed / 1000) * 1000,
        "throughput": 1000 / elapsed
    }
    
    print(f"  Time: {elapsed:.2f}s")
    print(f"  Per-text: {(elapsed/1000)*1000:.1f}ms")
    print(f"  Throughput: {1000/elapsed:.1f} texts/sec")
    
    # Print statistics
    print("\n" + "=" * 60)
    service.print_stats()
    
    # Save results
    output_file = Path("skills/local-embeddings/benchmark_results.json")
    with open(output_file, "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n✓ Benchmark results saved to {output_file}")
    print("=" * 60)
    
    return results


if __name__ == "__main__":
    # Run pytest tests
    print("Running pytest test suite...")
    pytest.main([__file__, "-v", "-s"])
    
    # Run benchmarks
    print("\n" + "=" * 60)
    print("Running benchmark suite...")
    run_benchmark_suite()
