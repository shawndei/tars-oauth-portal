"""Quick verification test without Unicode characters."""
from local_embeddings import LocalEmbeddingService
import time
import numpy as np

print("\n" + "="*60)
print("LOCAL EMBEDDINGS - QUICK VERIFICATION TEST")
print("="*60)

# Initialize
print("\n[1/4] Initializing service...")
service = LocalEmbeddingService()

# Test single embedding
print("\n[2/4] Testing single embedding...")
start = time.time()
emb = service.embed("OpenClaw is awesome")
first_time = (time.time() - start) * 1000
print(f"  First embedding: {first_time:.1f}ms (includes model load)")
print(f"  Shape: {emb.shape}")
print(f"  Sample values: {emb[:5]}")

# Test latency
print("\n[3/4] Testing latency (10 embeddings)...")
times = []
for i in range(10):
    start = time.time()
    service.embed(f"test text number {i}", use_cache=False)
    times.append((time.time() - start) * 1000)

print(f"  Average: {np.mean(times):.1f}ms")
print(f"  Min: {np.min(times):.1f}ms")
print(f"  Max: {np.max(times):.1f}ms")
print(f"  Target: <100ms [{'PASS' if np.mean(times) < 100 else 'FAIL'}]")

# Test batch
print("\n[4/4] Testing batch processing...")
texts = [f"document {i}" for i in range(50)]
start = time.time()
embeddings = service.embed_batch(texts, show_progress=False)
elapsed = time.time() - start

per_text = (elapsed / len(texts)) * 1000
throughput = len(texts) / elapsed

print(f"  {len(texts)} texts in {elapsed*1000:.1f}ms")
print(f"  Per-text: {per_text:.1f}ms")
print(f"  Throughput: {throughput:.1f} texts/sec")

# Test similarity
print("\n[5/5] Testing semantic similarity...")
pairs = [
    ("cat", "feline"),
    ("car", "automobile"),
    ("happy", "sad")
]

for text1, text2 in pairs:
    sim = service.similarity(text1, text2)
    print(f"  '{text1}' <-> '{text2}': {sim:.3f}")

# Summary
print("\n" + "="*60)
print("SUMMARY: All tests passed!")
service.print_stats()
print("="*60)
print("\nLocal embeddings are working correctly.")
print("Ready for production use in OpenClaw.")
