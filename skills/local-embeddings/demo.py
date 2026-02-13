"""
demo.py - Quick Demo of Local Embeddings

Demonstrates the core functionality of the local embedding service.
Run this after installing requirements.

Usage:
    python demo.py

Author: OpenClaw Agent
Date: 2026-02-13
"""

import sys
from pathlib import Path

try:
    from local_embeddings import LocalEmbeddingService, OpenAICompatibleEmbeddings
    import numpy as np
    import time
except ImportError as e:
    print(f"❌ Error: {e}")
    print("\n📦 Please install requirements first:")
    print("   pip install sentence-transformers torch numpy")
    sys.exit(1)


def demo_basic_usage():
    """Demonstrate basic embedding functionality."""
    print("\n" + "="*70)
    print("DEMO 1: Basic Embedding Usage")
    print("="*70)
    
    service = LocalEmbeddingService()
    
    # Single embedding
    print("\n📝 Single Text Embedding:")
    text = "OpenClaw is a powerful AI agent framework"
    start = time.time()
    embedding = service.embed(text)
    elapsed_ms = (time.time() - start) * 1000
    
    print(f"   Text: '{text}'")
    print(f"   Embedding shape: {embedding.shape}")
    print(f"   Embedding type: {embedding.dtype}")
    print(f"   Time: {elapsed_ms:.1f}ms")
    print(f"   First 5 values: {embedding[:5]}")
    
    # Verify normalization
    magnitude = np.linalg.norm(embedding)
    print(f"   Magnitude: {magnitude:.6f} (normalized: {abs(magnitude - 1.0) < 0.001})")


def demo_batch_processing():
    """Demonstrate batch embedding."""
    print("\n" + "="*70)
    print("DEMO 2: Batch Processing")
    print("="*70)
    
    service = LocalEmbeddingService()
    
    texts = [
        "Machine learning models learn from data",
        "Neural networks have multiple layers",
        "Deep learning is a subset of AI",
        "Natural language processing understands text",
        "Computer vision recognizes images"
    ]
    
    print(f"\n📦 Embedding {len(texts)} texts:")
    start = time.time()
    embeddings = service.embed_batch(texts)
    elapsed = time.time() - start
    
    print(f"   Batch size: {len(texts)}")
    print(f"   Embeddings shape: {embeddings.shape}")
    print(f"   Total time: {elapsed*1000:.1f}ms")
    print(f"   Per-text: {elapsed/len(texts)*1000:.1f}ms")
    print(f"   Throughput: {len(texts)/elapsed:.1f} texts/sec")


def demo_semantic_similarity():
    """Demonstrate semantic similarity."""
    print("\n" + "="*70)
    print("DEMO 3: Semantic Similarity")
    print("="*70)
    
    service = LocalEmbeddingService()
    
    test_pairs = [
        ("cat", "feline", "Synonyms"),
        ("car", "automobile", "Synonyms"),
        ("happy", "sad", "Antonyms"),
        ("king", "queen", "Related"),
        ("python", "programming", "Related"),
        ("ocean", "desert", "Unrelated")
    ]
    
    print("\n🔗 Similarity Scores:")
    for text1, text2, relationship in test_pairs:
        sim = service.similarity(text1, text2)
        bar = "█" * int(sim * 20)
        print(f"   '{text1:12s}' ↔ '{text2:12s}': {sim:.3f} {bar} ({relationship})")


def demo_semantic_search():
    """Demonstrate semantic search."""
    print("\n" + "="*70)
    print("DEMO 4: Semantic Search / RAG")
    print("="*70)
    
    service = LocalEmbeddingService()
    
    # Knowledge base
    documents = [
        "Python is a high-level programming language with simple syntax",
        "Machine learning models require large amounts of training data",
        "The Eiffel Tower is located in Paris, France",
        "Neural networks are inspired by biological neurons in the brain",
        "Pizza is a popular Italian dish with cheese and toppings",
        "Deep learning uses multiple layers to extract features from data",
        "The Great Wall of China is one of the world's largest structures",
        "Natural language processing enables computers to understand text",
    ]
    
    # Query
    query = "How do neural networks work?"
    
    print(f"\n🔍 Query: '{query}'")
    print(f"\n📚 Searching {len(documents)} documents...")
    
    results = service.find_similar(query, documents, top_k=3)
    
    print(f"\n🎯 Top Results:")
    for result in results:
        score = result['score']
        bar = "█" * int(score * 20)
        print(f"\n   Rank {result['rank']} - Score: {score:.3f} {bar}")
        print(f"   {result['text']}")


def demo_caching():
    """Demonstrate caching performance."""
    print("\n" + "="*70)
    print("DEMO 5: Caching Performance")
    print("="*70)
    
    service = LocalEmbeddingService()
    service.clear_cache()
    
    text = "This text will be cached for performance"
    
    # First call (no cache)
    print("\n⏱️  First embedding (uncached):")
    start = time.time()
    emb1 = service.embed(text, use_cache=True)
    uncached_time = (time.time() - start) * 1000
    print(f"   Time: {uncached_time:.1f}ms")
    
    # Second call (cached)
    print("\n⚡ Second embedding (cached):")
    start = time.time()
    emb2 = service.embed(text, use_cache=True)
    cached_time = (time.time() - start) * 1000
    print(f"   Time: {cached_time:.1f}ms")
    
    # Verify embeddings are identical
    identical = np.array_equal(emb1, emb2)
    speedup = uncached_time / cached_time
    
    print(f"\n📊 Results:")
    print(f"   Embeddings identical: {identical}")
    print(f"   Speedup: {speedup:.1f}x")
    print(f"   Time saved: {uncached_time - cached_time:.1f}ms")


def demo_openai_compatibility():
    """Demonstrate OpenAI-compatible API."""
    print("\n" + "="*70)
    print("DEMO 6: OpenAI Compatibility")
    print("="*70)
    
    embeddings = OpenAICompatibleEmbeddings()
    
    # Single text
    print("\n📤 Single Text (OpenAI format):")
    response = embeddings.create(input="Hello world")
    
    print(f"   Response keys: {list(response.keys())}")
    print(f"   Model: {response['model']}")
    print(f"   Data length: {len(response['data'])}")
    print(f"   Embedding dimensions: {len(response['data'][0]['embedding'])}")
    print(f"   Usage tokens: {response['usage']['total_tokens']}")
    
    # Multiple texts
    print("\n📤 Multiple Texts (batch):")
    texts = ["text one", "text two", "text three"]
    response = embeddings.create(input=texts)
    
    print(f"   Texts embedded: {len(response['data'])}")
    for item in response['data']:
        print(f"   - Index {item['index']}: {len(item['embedding'])} dimensions")


def demo_statistics():
    """Show service statistics."""
    print("\n" + "="*70)
    print("SESSION STATISTICS")
    print("="*70)
    
    # Access global service if it exists
    try:
        from local_embeddings import _default_service
        if '_default_service' in globals():
            _default_service.print_stats()
    except:
        pass
    
    # Create new service and show stats
    service = LocalEmbeddingService()
    
    # Generate some activity
    service.embed("test 1")
    service.embed("test 1")  # Cache hit
    service.embed("test 2")
    service.embed_batch(["test 3", "test 4", "test 5"])
    
    service.print_stats()


def main():
    """Run all demos."""
    print("\n")
    print("╔" + "="*68 + "╗")
    print("║" + " "*68 + "║")
    print("║" + "  LOCAL EMBEDDING SERVICE - INTERACTIVE DEMO".center(68) + "║")
    print("║" + " "*68 + "║")
    print("╚" + "="*68 + "╝")
    
    try:
        demo_basic_usage()
        demo_batch_processing()
        demo_semantic_similarity()
        demo_semantic_search()
        demo_caching()
        demo_openai_compatibility()
        demo_statistics()
        
        print("\n" + "="*70)
        print("✅ All demos completed successfully!")
        print("="*70)
        print("\n💡 Next Steps:")
        print("   1. Review SKILL.md for complete documentation")
        print("   2. Run tests: pytest test_embeddings.py -v")
        print("   3. Compare with OpenAI: python compare_openai.py")
        print("   4. Integrate into your OpenClaw workflows")
        print()
        
    except Exception as e:
        print(f"\n❌ Error running demos: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
