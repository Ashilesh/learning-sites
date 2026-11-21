// Pros & cons "trading cards", keyed by the guide section they appear after.
// v (verdict): 'use' ✅ · 'ok' 👍 (fine / situational) · 'legacy' ⚠️ · 'avoid' ❌ · 'idea' 💡 (a concept, not a product)

export const PROSCONS = {
  '2.5': { title: 'Classical ciphers: the scorecard', items: [
    { name: 'Caesar cipher', v: 'avoid', tag: 'Shift every letter by k', pros: ['Dead simple; great for teaching', 'Encrypt and decrypt by hand'], cons: ['Only 25 keys: brute-forced in seconds', 'Keeps letter frequencies intact'], best: 'Puzzles and kids’ secret notes' },
    { name: 'Substitution', v: 'avoid', tag: 'Scramble the whole alphabet', pros: ['26! ≈ 4 × 10²⁶ keys', 'Defeats brute force by hand'], cons: ['Frequency analysis breaks it (Al-Kindi, ~850 AD)', 'Same letter → same symbol every time'], best: 'Newspaper cryptograms' },
    { name: 'Vigenère', v: 'avoid', tag: 'A different shift per letter', pros: ['Flattens simple letter frequencies', 'Resisted attack for ~300 years'], cons: ['The keyword repeats → Kasiski / Babbage attack', 'Short keywords fall quickly'], best: 'History lessons' },
    { name: 'Enigma', v: 'avoid', tag: 'Rotors change the substitution each key press', pros: ['~1.59 × 10²⁰ settings', 'Different substitution for every letter'], cons: ['Never encrypted a letter as itself', 'Predictable cribs and lazy operators'], best: 'Museums and movies' },
    { name: 'One-time pad', v: 'idea', tag: 'Truly random key as long as the message, used once', pros: ['Mathematically proven unbreakable (Shannon, 1949)', 'Secure even against infinite computing power'], cons: ['Key must be as long as all your messages', 'Must be delivered securely in advance', 'Reuse destroys it (Venona)'], best: 'Rare diplomatic hotlines' },
  ]},

  '4.2': { title: 'Random number generators compared', items: [
    { name: 'TRNG', v: 'ok', tag: 'Measures physical chaos', pros: ['Genuinely unpredictable', 'Great seed material (even lava lamps!)'], cons: ['Slow and hardware-dependent', 'Can be biased without post-processing'], best: 'Seeding a CSPRNG' },
    { name: 'PRNG', v: 'avoid', tag: 'A formula from a seed (e.g. Mersenne Twister)', pros: ['Very fast', 'Reproducible: same seed, same sequence'], cons: ['Predictable after enough output (624 for MT)', 'Never safe for keys, tokens or salts'], best: 'Games, simulations, shuffling playlists' },
    { name: 'CSPRNG', v: 'use', tag: 'Crypto-built generator seeded with true randomness', pros: ['Unpredictable even after seeing lots of output', 'Built into every OS and language'], cons: ['Must be seeded properly (early-boot devices failed)', 'Slightly slower than a plain PRNG'], best: 'Keys, nonces, salts, tokens: anything security-related' },
  ]},

  '5.3': { title: 'Stream vs. block ciphers', items: [
    { name: 'Stream cipher', v: 'ok', tag: 'Keystream ⊕ plaintext', pros: ['No padding; any length', 'Fast, low latency, great in software'], cons: ['Key + nonce reuse = two-time pad', 'Malleable without a MAC'], best: 'ChaCha20 in TLS, WireGuard, Signal' },
    { name: 'Block cipher', v: 'ok', tag: 'Scrambles fixed 16-byte blocks', pros: ['Very well studied (AES)', 'Hardware acceleration everywhere', 'Flexible via modes'], cons: ['Needs a mode of operation to be useful', 'Wrong mode (ECB) leaks patterns'], best: 'AES-GCM almost everywhere' },
  ]},

  '5.4': { title: 'Stream ciphers', items: [
    { name: 'RC4', v: 'avoid', tag: 'Was everywhere in the 90s and 2000s', pros: ['Tiny and fast', 'Easy to implement'], cons: ['Statistically biased output', 'Broke WEP; banned from TLS in 2015'], best: 'Nothing, anymore' },
    { name: 'ChaCha20', v: 'use', tag: 'ARX design by Daniel J. Bernstein', pros: ['Fast on any CPU, even without AES hardware', 'Only add, rotate and XOR: naturally constant time', 'Huge security margin'], cons: ['Slower than AES where AES-NI exists', 'Still needs Poly1305 for integrity'], best: 'Phones, IoT, TLS, WireGuard, SSH' },
  ]},

  '5.5': { title: 'Block ciphers', items: [
    { name: 'DES', v: 'avoid', tag: '1977, 56-bit key', pros: ['Historic: decades of public cryptanalysis'], cons: ['Brute-forced in 56 hours (1998)', '64-bit blocks'], best: 'History class' },
    { name: '3DES', v: 'avoid', tag: 'DES three times, 112-bit effective', pros: ['Backwards compatible with DES hardware', 'No practical key-recovery attack'], cons: ['Slow (3 passes)', '64-bit blocks → Sweet32', 'Disallowed by NIST after 2023'], best: 'Legacy payment systems being migrated' },
    { name: 'AES', v: 'use', tag: 'Rijndael, the 2001 world standard', pros: ['Open competition winner, 25 years of scrutiny', 'Hardware instructions (AES-NI, ARMv8)', '128/192/256-bit keys'], cons: ['Table-based software can leak timing', 'Only as good as its mode'], best: 'Everything: HTTPS, Wi-Fi, disks, messaging' },
    { name: 'Blowfish', v: 'legacy', tag: '1993, up to 448-bit keys', pros: ['Unbroken core design', 'Lives on inside bcrypt'], cons: ['64-bit blocks (Sweet32)', 'Slow key setup'], best: 'Only inside bcrypt' },
  ]},

  '5.6': { title: 'Modes of operation', items: [
    { name: 'ECB', v: 'avoid', tag: 'Each block alone', pros: ['Simple, parallel'], cons: ['Identical blocks → identical ciphertext (the penguin!)', 'No integrity'], best: 'Never' },
    { name: 'CBC', v: 'legacy', tag: 'Chain each block to the previous one', pros: ['Hides patterns', 'Supported everywhere'], cons: ['Needs padding → padding oracles', 'Encryption not parallel', 'Needs a separate MAC'], best: 'Legacy systems, with Encrypt-then-MAC' },
    { name: 'CTR', v: 'ok', tag: 'Encrypt a counter → keystream', pros: ['Parallel and seekable', 'No padding'], cons: ['Nonce reuse is fatal', 'Malleable: bits flip straight through'], best: 'Building block (inside GCM)' },
    { name: 'GCM', v: 'use', tag: 'CTR + authentication tag (AEAD)', pros: ['Secrecy + integrity in one step', 'Fast with hardware', 'Protects most HTTPS traffic'], cons: ['Nonce reuse leaks data AND allows forgery', 'Rotate keys before ~2³² random nonces'], best: 'Default for new designs' },
    { name: 'XTS', v: 'ok', tag: 'Tweakable mode for disk sectors', pros: ['Same-size output: fits disk sectors', 'Each sector encrypted differently'], cons: ['No integrity (by design)', 'Only for storage'], best: 'BitLocker, FileVault, LUKS' },
  ]},

  '5.8': { title: 'AEADs: the modern way to encrypt', items: [
    { name: 'AES-GCM', v: 'use', tag: 'AES + Galois MAC', pros: ['Blazing fast with AES-NI', 'Standard in TLS, IPsec, SSH, cloud'], cons: ['Catastrophic on nonce reuse', 'Slow and tricky in pure software'], best: 'Servers and laptops' },
    { name: 'ChaCha20-Poly1305', v: 'use', tag: 'Stream cipher + one-time MAC', pros: ['Fast everywhere, even cheap phones', 'Simple to implement safely'], cons: ['Still needs unique nonces (96-bit)', 'Slightly slower than AES-NI on desktops'], best: 'Mobile, WireGuard, Signal' },
    { name: 'XChaCha20-Poly1305', v: 'use', tag: '192-bit nonce variant', pros: ['Random nonces are safe', 'Same speed as ChaCha20'], cons: ['Not in TLS', 'Fewer standard libraries'], best: 'Apps that pick random nonces' },
    { name: 'AES-GCM-SIV', v: 'use', tag: 'Nonce-misuse resistant', pros: ['Survives accidental nonce reuse (only reveals duplicates)', 'AES-NI speed'], cons: ['Two passes over the data', 'Less widely deployed'], best: 'When nonce uniqueness can’t be guaranteed' },
  ]},

  '6.5': { title: 'Hash functions', items: [
    { name: 'MD5', v: 'avoid', tag: '1992, 128-bit', pros: ['Very fast', 'Fine as a non-security checksum'], cons: ['Collisions in seconds on a laptop', 'Used to forge a Microsoft certificate (Flame)'], best: 'Detecting accidental corruption only' },
    { name: 'SHA-1', v: 'avoid', tag: '1995, 160-bit', pros: ['Still everywhere in old systems'], cons: ['SHAttered collision (2017)', 'Chosen-prefix collision for ~$45k (2020)'], best: 'Nothing new' },
    { name: 'SHA-256 / SHA-512', v: 'use', tag: 'SHA-2 family, 2001', pros: ['The internet’s workhorse', 'Hardware support (SHA-NI)', 'No practical attacks'], cons: ['Length-extension attack (use HMAC)', 'Too fast for passwords'], best: 'TLS, certificates, Bitcoin, Git’s future' },
    { name: 'SHA-3', v: 'use', tag: 'Keccak sponge, 2015', pros: ['Totally different design: a backup for SHA-2', 'Immune to length extension'], cons: ['Slower in software than SHA-2/BLAKE', 'Less hardware support'], best: 'Diversity; KMAC; new standards' },
    { name: 'BLAKE2', v: 'use', tag: '2012', pros: ['Faster than MD5, yet secure', 'Built-in keyed mode'], cons: ['Not a NIST standard (matters for FIPS)'], best: 'WireGuard, Argon2, file integrity' },
    { name: 'BLAKE3', v: 'use', tag: '2020', pros: ['Extremely fast and parallel', 'Any output length; built-in tree mode'], cons: ['Young; not FIPS', 'Smaller security margin (fewer rounds)'], best: 'Hashing huge files fast' },
  ]},

  '6.6': { title: 'Hash designs', items: [
    { name: 'Merkle–Damgård', v: 'ok', tag: 'MD5, SHA-1, SHA-2', pros: ['Simple, well understood', 'Proven: collision-resistant if the compression is'], cons: ['Output = internal state → length extension'], best: 'SHA-256 (with HMAC for keyed use)' },
    { name: 'Sponge', v: 'use', tag: 'SHA-3, absorb then squeeze', pros: ['Hidden capacity blocks length extension', 'Flexible output length (SHAKE)'], cons: ['Large state; slower in software'], best: 'SHA-3, KMAC, ML-KEM internals' },
  ]},

  '7.3': { title: 'MAC algorithms', items: [
    { name: 'HMAC-SHA256', v: 'use', tag: 'Hash twice with the key', pros: ['Works with any hash; immune to length extension', 'Supported everywhere'], cons: ['Slower than Poly1305/GMAC', 'Needs constant-time tag checks'], best: 'APIs, webhooks, JWT HS256, TOTP, HKDF' },
    { name: 'Poly1305', v: 'use', tag: 'Fast one-time MAC', pros: ['Very fast, provable security'], cons: ['Key must be used once only (ChaCha20 handles this)'], best: 'Inside ChaCha20-Poly1305' },
    { name: 'GMAC / GHASH', v: 'ok', tag: 'Galois field MAC', pros: ['Hardware fast (PCLMUL)'], cons: ['Nonce reuse breaks it badly', 'Rarely used standalone'], best: 'Inside AES-GCM' },
    { name: 'CMAC', v: 'ok', tag: 'MAC built from AES', pros: ['Only needs an AES engine', 'Standardized (NIST SP 800-38B)'], cons: ['Slower than HMAC in software'], best: 'Smart cards, banking hardware' },
    { name: 'KMAC', v: 'ok', tag: 'MAC built from SHA-3', pros: ['Simple: SHA-3 needs no HMAC wrapper', 'Variable output length'], cons: ['Less library support'], best: 'Newer standards' },
  ]},

  '7.4': { title: 'Combining encryption and a MAC', items: [
    { name: 'Encrypt-then-MAC', v: 'use', tag: 'MAC the ciphertext', pros: ['Rejects tampering before decrypting', 'Provably secure composition'], cons: ['Two keys and two passes to manage'], best: 'When you can’t use an AEAD' },
    { name: 'MAC-then-Encrypt', v: 'avoid', tag: 'MAC the plaintext, encrypt both', pros: ['Hides the tag'], cons: ['Must decrypt before verifying', 'Caused Lucky Thirteen and POODLE'], best: 'Old TLS (don’t copy it)' },
    { name: 'Encrypt-and-MAC', v: 'avoid', tag: 'Separate MAC of the plaintext', pros: ['Parallel'], cons: ['The MAC can leak plaintext info', 'Decrypt-before-verify'], best: 'Old SSH (don’t copy it)' },
    { name: 'AEAD', v: 'use', tag: 'All-in-one, designed by experts', pros: ['One key, one call, one tag', 'Hard to get wrong'], cons: ['Still requires unique nonces'], best: 'Always, when available' },
  ]},

  '7.7': { title: 'MAC vs. signature', items: [
    { name: 'MAC', v: 'use', tag: 'One shared secret', pros: ['Very fast and tiny', 'Simple key handling between two parties'], cons: ['Both sides can make tags: no non-repudiation', 'Key must be shared securely first'], best: 'Two parties who already share a key' },
    { name: 'Digital signature', v: 'use', tag: 'Private signs, public verifies', pros: ['Anyone can verify', 'Non-repudiation'], cons: ['Slower; bigger output', 'Needs a way to trust the public key (PKI)'], best: 'Software, documents, certificates' },
  ]},

  '8.4': { title: 'Password hashing algorithms', items: [
    { name: 'Argon2id', v: 'use', tag: '2015, PHC winner', pros: ['Memory-hard: cripples GPUs and ASICs', 'Tunable memory, time and threads'], cons: ['Not FIPS-approved', 'Memory cost must be tuned for your servers'], best: 'First choice for new systems' },
    { name: 'scrypt', v: 'use', tag: '2009', pros: ['Memory-hard', 'In Python’s standard library'], cons: ['Parameters interact in confusing ways', 'Memory and time tied together'], best: 'Good alternative; crypto wallets' },
    { name: 'bcrypt', v: 'ok', tag: '1999, Blowfish-based', pros: ['Battle-tested for 25 years', 'Supported by every framework'], cons: ['Only the first 72 bytes count', 'Only partly memory-hard (4 KB)'], best: 'Existing systems; cost ≥ 10' },
    { name: 'PBKDF2', v: 'legacy', tag: '2000, iterated HMAC', pros: ['FIPS-approved; everywhere', 'Simple'], cons: ['Not memory-hard: GPUs love it', 'Needs 600,000+ iterations'], best: 'When regulations require FIPS' },
    { name: 'Fast hash (+salt)', v: 'avoid', tag: 'SHA-256, MD5…', pros: ['Salt stops rainbow tables'], cons: ['Billions of guesses per second on a GPU'], best: 'Never for passwords' },
  ]},

  '8.8': { title: 'Key derivation functions', items: [
    { name: 'HKDF', v: 'use', tag: 'Extract-then-Expand', pros: ['Turns one strong secret into many independent keys', 'Used by TLS 1.3, Signal, Noise'], cons: ['Useless for passwords (it’s fast)', 'Input must already be high-entropy'], best: 'After key exchange' },
    { name: 'Password KDF', v: 'use', tag: 'Argon2, scrypt, PBKDF2', pros: ['Makes a human password usable as a key', 'Slow on purpose'], cons: ['Weak passwords stay weak', 'Costs server CPU and RAM'], best: 'Password managers, encrypted archives, Wi-Fi' },
  ]},

  '9.4': { title: 'RSA paddings', items: [
    { name: 'Textbook RSA', v: 'avoid', tag: 'c = mᵉ mod n', pros: ['Great for learning the math'], cons: ['Deterministic: guess-and-compare', 'Malleable: ciphertexts multiply'], best: 'Classroom only' },
    { name: 'RSA-OAEP', v: 'use', tag: 'Randomized encryption padding', pros: ['Provably secure (in the random oracle model)', 'Widely supported'], cons: ['Max ~318 bytes with a 3072-bit key', 'Slow decryption'], best: 'Wrapping a symmetric key' },
    { name: 'PKCS#1 v1.5 (encryption)', v: 'avoid', tag: '1990s padding', pros: ['Everywhere in old systems'], cons: ['Bleichenbacher (1998) and ROBOT (2017) attacks'], best: 'Nothing new' },
    { name: 'RSA-PSS', v: 'use', tag: 'Randomized signature padding', pros: ['Security proof', 'Used by TLS 1.3'], cons: ['Big signatures (384 B at 3072 bits)'], best: 'RSA signatures' },
  ]},

  '9.5': { title: 'Public-key families and curves', items: [
    { name: 'RSA', v: 'ok', tag: 'Factoring, 1977', pros: ['Universally supported', 'Encrypt and sign with one algorithm', 'Fast verification'], cons: ['Huge keys (3072 bits for 128-bit security)', 'Slow key generation and decryption', 'Broken by quantum computers'], best: 'Legacy compatibility, certificates' },
    { name: 'P-256', v: 'use', tag: 'NIST curve, secp256r1', pros: ['In every TLS stack and secure chip', 'Passkeys and government use'], cons: ['Easy to implement unsafely', 'Some distrust its unexplained constants'], best: 'TLS certificates, passkeys, hardware' },
    { name: 'Curve25519', v: 'use', tag: 'X25519 / Ed25519', pros: ['Fast, 32-byte keys', 'Designed to be hard to misuse', 'Explainable constants'], cons: ['Not in some older FIPS/hardware stacks'], best: 'TLS, SSH, Signal, WireGuard, Tor' },
    { name: 'secp256k1', v: 'ok', tag: 'Koblitz curve', pros: ['Efficient; huge real-world deployment'], cons: ['Little use outside cryptocurrencies'], best: 'Bitcoin and Ethereum' },
  ]},

  '9.9': { title: 'Symmetric vs. asymmetric', items: [
    { name: 'Symmetric', v: 'use', tag: 'One shared key', pros: ['Gigabytes per second', 'Small keys; quantum-resistant with 256 bits'], cons: ['Key distribution problem', 'n(n−1)/2 keys for n people'], best: 'Encrypting the actual data' },
    { name: 'Asymmetric', v: 'use', tag: 'Public + private key', pros: ['Talk securely with strangers', 'Signatures and non-repudiation'], cons: ['Thousands of times slower', 'Only tiny data; today’s algorithms fall to quantum'], best: 'Key exchange, signatures, wrapping keys' },
  ]},

  '10.4': { title: 'Key-exchange variants', items: [
    { name: 'Finite-field DHE', v: 'legacy', tag: 'Big primes, 2048–4096 bits', pros: ['Simple math, old and well understood', 'Forward secrecy when ephemeral'], cons: ['Large and slow', 'Weak or shared groups caused Logjam'], best: 'Legacy compatibility' },
    { name: 'ECDHE (P-256)', v: 'use', tag: 'Elliptic-curve DH', pros: ['Small and fast', 'FIPS-friendly'], cons: ['Must validate received points'], best: 'Regulated environments' },
    { name: 'X25519', v: 'use', tag: 'Curve25519 DH', pros: ['32-byte keys, very fast', 'Any 32 bytes is a valid key: fewer pitfalls'], cons: ['Not quantum-safe on its own'], best: 'The default classical choice' },
    { name: 'X25519MLKEM768', v: 'use', tag: 'Hybrid classical + post-quantum', pros: ['Attacker must break both', 'Stops harvest-now-decrypt-later', 'Default in major browsers'], cons: ['~1.2 KB of key data per handshake', 'Newer code paths'], best: 'Any connection carrying long-lived secrets' },
    { name: 'Static RSA key transport', v: 'avoid', tag: 'TLS_RSA_WITH_…', pros: ['Simple; old'], cons: ['No forward secrecy', 'Bleichenbacher/ROBOT', 'Removed from TLS 1.3'], best: 'Nowhere' },
  ]},

  '10.6': { title: 'Ephemeral vs. static keys', items: [
    { name: 'Ephemeral (DHE/ECDHE)', v: 'use', tag: 'Fresh keys per session, then deleted', pros: ['Forward secrecy', 'A stolen server key can’t decrypt past recordings'], cons: ['A key exchange for every connection', 'Can’t passively decrypt for monitoring (a feature!)'], best: 'Every modern protocol' },
    { name: 'Static', v: 'avoid', tag: 'Same key for years', pros: ['Simpler', 'Enables passive decryption for debugging'], cons: ['One stolen key decrypts everything, past and future'], best: 'Avoid for traffic encryption' },
  ]},

  '10.7': { title: 'Diffie-Hellman vs. KEM', items: [
    { name: 'Diffie-Hellman', v: 'use', tag: 'Both sides contribute', pros: ['Symmetric, elegant', 'Tiny with X25519'], cons: ['No lattice-based DH is practical yet'], best: 'Classical key agreement' },
    { name: 'KEM', v: 'use', tag: 'One side wraps a fresh secret', pros: ['Fits post-quantum math (ML-KEM)', 'Clean API: encapsulate / decapsulate'], cons: ['Bigger messages (ML-KEM-768 ciphertext is 1,088 bytes)'], best: 'Post-quantum and HPKE' },
  ]},

  '11.5': { title: 'Signature algorithms', items: [
    { name: 'RSA PKCS#1 v1.5', v: 'legacy', tag: 'Classic RSA signatures', pros: ['Universal in certificates'], cons: ['No security proof; big signatures'], best: 'Existing certificate chains' },
    { name: 'RSA-PSS', v: 'use', tag: 'Modern RSA signatures', pros: ['Provable security; TLS 1.3'], cons: ['256–512-byte signatures', 'Slow signing'], best: 'Where RSA is required' },
    { name: 'DSA', v: 'avoid', tag: 'Discrete-log signatures', pros: ['Historic standard'], cons: ['Obsolete; nonce-reuse fragile'], best: 'Nowhere' },
    { name: 'ECDSA P-256', v: 'use', tag: 'Elliptic-curve DSA', pros: ['Small, fast, in every secure chip', 'Passkeys and certificates'], cons: ['Needs a perfect random nonce per signature (PS3!)', 'Use RFC 6979 deterministic nonces'], best: 'TLS certs, passkeys, hardware' },
    { name: 'Ed25519', v: 'use', tag: 'EdDSA on Curve25519', pros: ['Deterministic: no nonce to get wrong', '32-byte keys, 64-byte signatures, very fast'], cons: ['Not in some older hardware/FIPS stacks'], best: 'SSH, Git, software signing, new designs' },
    { name: 'Schnorr (secp256k1)', v: 'ok', tag: 'Bitcoin Taproot', pros: ['Simple, provable, aggregatable'], cons: ['Ecosystem mostly crypto-currency'], best: 'Bitcoin multisig' },
    { name: 'ML-DSA (Dilithium)', v: 'use', tag: 'Lattice, FIPS 204', pros: ['Quantum-resistant', 'Fast signing and verifying'], cons: ['~2.4–4.6 KB signatures', 'Young in production'], best: 'Post-quantum signatures' },
    { name: 'SLH-DSA (SPHINCS+)', v: 'ok', tag: 'Hash-based, FIPS 205', pros: ['Relies only on hash functions: very conservative', 'Tiny public keys'], cons: ['8–50 KB signatures', 'Slow signing'], best: 'Firmware and long-lived roots' },
    { name: 'FN-DSA (Falcon)', v: 'ok', tag: 'Compact lattice signatures', pros: ['Smallest post-quantum lattice signatures'], cons: ['Floating-point math is hard to implement safely', 'Standard still being finalized'], best: 'Bandwidth-tight PQ use' },
  ]},

  '12.5': { title: 'TCP vs. UDP', items: [
    { name: 'TCP', v: 'ok', tag: 'Reliable, ordered', pros: ['Retransmits lost packets', 'Simple for apps'], cons: ['Handshake round trip', 'Head-of-line blocking'], best: 'HTTP/1.1, HTTP/2, SSH, email' },
    { name: 'UDP', v: 'ok', tag: 'Fire-and-forget', pros: ['No handshake; low latency', 'Base for QUIC and WireGuard'], cons: ['No delivery or order guarantee', 'Often blocked by strict firewalls'], best: 'DNS, video calls, games, HTTP/3' },
  ]},

  '13.7': { title: 'Certificate validation levels', items: [
    { name: 'DV', v: 'use', tag: 'Domain Validation', pros: ['Free and automatic (seconds)', 'Enables HTTPS everywhere'], cons: ['Proves domain control only, not identity', 'Phishers get them too'], best: 'Almost every website' },
    { name: 'OV', v: 'ok', tag: 'Organization Validation', pros: ['Organization named in the certificate'], cons: ['Paid; days to issue', 'Users never look'], best: 'Corporate policy requirements' },
    { name: 'EV', v: 'legacy', tag: 'Extended Validation', pros: ['Strictest identity checks'], cons: ['Expensive; browsers removed the green bar (~2019)', 'Research showed users didn’t notice'], best: 'Rarely worth it now' },
  ]},

  '13.10': { title: 'Revocation methods', items: [
    { name: 'CRL', v: 'ok', tag: 'Signed list of revoked serials', pros: ['Simple, offline-friendly', 'Making a comeback'], cons: ['Lists can get big', 'Clients must download them'], best: 'Browser-pushed lists & enterprise' },
    { name: 'OCSP', v: 'legacy', tag: 'Ask the CA live', pros: ['Fresh per-certificate status'], cons: ['Slow; leaks your browsing to the CA', 'Soft-fail lets attackers block it'], best: 'Being phased out (Let’s Encrypt ended it in 2025)' },
    { name: 'OCSP stapling', v: 'ok', tag: 'Server attaches the answer', pros: ['No privacy leak; no extra round trip'], cons: ['Not universally deployed'], best: 'Servers that still use OCSP' },
    { name: 'Short-lived certs', v: 'use', tag: 'Expire before revocation matters', pros: ['Damage window shrinks automatically', 'Forces automation'], cons: ['Requires reliable ACME automation'], best: 'The direction the industry is heading' },
  ]},

  '13.13': { title: 'Key and certificate file formats', items: [
    { name: 'PEM', v: 'use', tag: 'Base64 between BEGIN/END lines', pros: ['Human-readable, copy-pasteable', 'Can hold a whole chain'], cons: ['Easy to confuse what’s inside'], best: 'Linux servers, nginx, OpenSSL' },
    { name: 'DER', v: 'ok', tag: 'Raw binary ASN.1', pros: ['Compact; what’s actually signed'], cons: ['Not readable or pasteable'], best: 'Java, Windows, embedded' },
    { name: 'PKCS#12 (.p12/.pfx)', v: 'ok', tag: 'Password-protected bundle', pros: ['Key + cert + chain in one file', 'Imports into Windows/macOS/Java'], cons: ['Old files use weak encryption', 'Password handling'], best: 'Moving identities between systems' },
  ]},

  '13.15': { title: 'Ways to trust a key', items: [
    { name: 'Hierarchical PKI', v: 'use', tag: 'Certificate authorities', pros: ['Scales to billions of users', 'Automatic for users'], cons: ['Any CA can issue for any domain (CT helps)', 'Central points of failure'], best: 'The web' },
    { name: 'TOFU', v: 'ok', tag: 'Trust on first use', pros: ['Zero setup', 'Detects key changes later'], cons: ['The very first connection is unprotected'], best: 'SSH' },
    { name: 'Web of trust', v: 'legacy', tag: 'People sign each other’s keys', pros: ['No central authority'], cons: ['Hard to use; doesn’t scale', 'Leaks social graphs'], best: 'PGP enthusiasts' },
    { name: 'Manual fingerprints', v: 'use', tag: 'Compare out of band', pros: ['Strongest assurance'], cons: ['Few people actually do it'], best: 'Signal safety numbers' },
    { name: 'DANE', v: 'ok', tag: 'Certificates in DNSSEC', pros: ['Domain owner controls trust'], cons: ['Depends on DNSSEC deployment'], best: 'Mail servers' },
    { name: 'Pinning', v: 'ok', tag: 'App hard-codes expected keys', pros: ['Blocks rogue CAs and interception'], cons: ['Mistakes lock users out (HPKP was abandoned)'], best: 'Mobile banking apps' },
  ]},

  '14.2': { title: 'SSL/TLS versions', items: [
    { name: 'SSL 2.0 / 3.0', v: 'avoid', tag: '1995 / 1996', pros: ['Started web encryption'], cons: ['POODLE, DROWN; fundamentally broken'], best: 'Disable everywhere' },
    { name: 'TLS 1.0 / 1.1', v: 'avoid', tag: '1999 / 2006', pros: ['Widely compatible in their day'], cons: ['BEAST, SHA-1/MD5 internals', 'Deprecated in 2021'], best: 'Disable everywhere' },
    { name: 'TLS 1.2', v: 'legacy', tag: '2008', pros: ['Universal support', 'Secure with ECDHE + AEAD'], cons: ['Many dangerous options to misconfigure', '2-round-trip handshake'], best: 'Fallback for old clients' },
    { name: 'TLS 1.3', v: 'use', tag: '2018', pros: ['1-RTT handshake; encrypts more of it', 'Only secure options left', 'Forward secrecy always'], cons: ['0-RTT data is replayable', 'Breaks some legacy middleboxes'], best: 'Everything new' },
  ]},

  '14.8': { title: 'Session resumption', items: [
    { name: 'Resumption (PSK)', v: 'use', tag: 'Reuse a ticket from last time', pros: ['Skips certificate checks: faster', 'Less CPU on busy servers'], cons: ['Ticket keys must be rotated or they weaken forward secrecy'], best: 'Returning visitors' },
    { name: '0-RTT', v: 'ok', tag: 'Send data with the first packet', pros: ['Zero waiting on repeat visits'], cons: ['Early data can be replayed', 'Only safe for idempotent requests (GETs)'], best: 'Static content' },
  ]},

  '14.10': { title: 'HTTP versions', items: [
    { name: 'HTTP/2', v: 'use', tag: 'Over TLS + TCP', pros: ['Multiplexes many requests on one connection'], cons: ['TCP head-of-line blocking on lossy networks'], best: 'Default for most sites' },
    { name: 'HTTP/3 (QUIC)', v: 'use', tag: 'TLS 1.3 built into QUIC over UDP', pros: ['Faster setup; no head-of-line blocking', 'Survives network changes (Wi-Fi → 4G)'], cons: ['UDP sometimes blocked', 'Harder for middleboxes to inspect'], best: 'Mobile and global sites' },
  ]},

  '14.11': { title: 'Mutual TLS', items: [
    { name: 'mTLS', v: 'use', tag: 'Both sides show certificates', pros: ['Strong machine identity, no passwords', 'Zero-trust networks'], cons: ['Certificate issuance and rotation for every client', 'Painful for human users'], best: 'Service-to-service traffic' },
  ]},

  '14.13': { title: 'TLS interception', items: [
    { name: 'Corporate TLS inspection', v: 'legacy', tag: 'An “approved” man in the middle', pros: ['Lets companies scan for malware and data leaks'], cons: ['Breaks end-to-end security', 'Middleboxes often validate certificates badly', 'One box sees every secret'], best: 'Only with careful policy' },
  ]},

  '15.1': { title: 'SSH authentication', items: [
    { name: 'Password login', v: 'avoid', tag: 'Type a password', pros: ['Nothing to set up'], cons: ['Brute-forced by bots 24/7', 'Phishable, reusable'], best: 'Disable on servers' },
    { name: 'Ed25519 key', v: 'use', tag: 'ssh-keygen -t ed25519', pros: ['Can’t be guessed; short keys', 'Works with agents'], cons: ['Private key file must be protected with a passphrase'], best: 'Everyday SSH' },
    { name: 'ed25519-sk (hardware)', v: 'use', tag: 'Key lives on a YubiKey', pros: ['Private key can’t be copied off the device', 'Requires a physical touch'], cons: ['Need the device with you; buy a backup'], best: 'Admins and high-value servers' },
    { name: 'SSH certificates', v: 'use', tag: 'A CA signs user/host keys', pros: ['No TOFU prompts; short-lived access'], cons: ['You need to run an SSH CA'], best: 'Larger fleets' },
  ]},

  '15.2': { title: 'VPN protocols', items: [
    { name: 'WireGuard', v: 'use', tag: '~4,000 lines, fixed modern crypto', pros: ['Tiny, fast, easy to audit', 'No negotiation → no downgrades'], cons: ['UDP only', 'Static IP assignments need extra tooling'], best: 'Most new VPNs' },
    { name: 'IPsec / IKEv2', v: 'use', tag: 'Network layer standard', pros: ['Built into every OS and router', 'Great for site-to-site'], cons: ['Complex configuration', 'Huge spec'], best: 'Enterprise and mobile' },
    { name: 'OpenVPN', v: 'ok', tag: 'TLS-based', pros: ['Flexible; works over TCP 443'], cons: ['Slower; large code base'], best: 'Restrictive networks' },
    { name: 'L2TP/IPsec', v: 'legacy', tag: 'Older combo', pros: ['Widely supported'], cons: ['Double encapsulation; often weak pre-shared keys'], best: 'Legacy clients' },
    { name: 'PPTP', v: 'avoid', tag: 'MS-CHAPv2 + RC4', pros: ['Ancient and easy'], cons: ['Completely broken'], best: 'Never' },
  ]},

  '15.3': { title: 'Wi-Fi security', items: [
    { name: 'Open', v: 'avoid', tag: 'No encryption', pros: ['Easy to join'], cons: ['Anyone nearby reads unencrypted traffic'], best: 'Only with HTTPS/VPN on top' },
    { name: 'WEP', v: 'avoid', tag: 'RC4 + 24-bit IV', pros: ['None today'], cons: ['Cracked in minutes'], best: 'Never' },
    { name: 'WPA (TKIP)', v: 'avoid', tag: 'Patched RC4 stopgap', pros: ['Was better than WEP'], cons: ['Obsolete'], best: 'Never' },
    { name: 'WPA2-AES', v: 'ok', tag: 'AES-CCMP, 4-way handshake', pros: ['Supported by every device'], cons: ['Captured handshakes allow offline guessing', 'KRACK (patched)'], best: 'Old devices, with a long passphrase' },
    { name: 'WPA3 (SAE)', v: 'use', tag: 'Dragonfly PAKE', pros: ['No offline guessing', 'Forward secrecy'], cons: ['Older devices can’t join', 'Early Dragonblood bugs (patched)'], best: 'Every home and office' },
    { name: 'Enterprise (802.1X)', v: 'use', tag: 'Per-user login via RADIUS', pros: ['Individual credentials; easy revocation'], cons: ['Devices must check the server certificate (evil twins!)'], best: 'Companies and universities (eduroam)' },
  ]},

  '15.4': { title: 'DNS security', items: [
    { name: 'DNSSEC', v: 'ok', tag: 'Signed answers', pros: ['Detects forged DNS answers', 'Enables DANE'], cons: ['No privacy', 'Complex; outages from expired signatures'], best: 'Authenticity of DNS data' },
    { name: 'DNS over TLS (DoT)', v: 'use', tag: 'Port 853', pros: ['Encrypts lookups', 'Easy for networks to manage'], cons: ['Dedicated port is easy to block'], best: 'Phones (Android Private DNS), routers' },
    { name: 'DNS over HTTPS (DoH)', v: 'use', tag: 'Looks like normal HTTPS', pros: ['Encrypts lookups; hard to block'], cons: ['Moves trust to the resolver provider', 'Hides DNS from network admins'], best: 'Browsers' },
  ]},

  '16.1': { title: 'Email protections', items: [
    { name: 'STARTTLS / TLS', v: 'ok', tag: 'Encryption in transit', pros: ['Automatic, invisible'], cons: ['Servers can read your mail', 'Opportunistic: can be stripped'], best: 'Baseline for all mail' },
    { name: 'PGP / GnuPG', v: 'legacy', tag: 'End-to-end, web of trust', pros: ['No central authority', 'Strong when used correctly'], cons: ['Hard to use; metadata visible', 'No forward secrecy'], best: 'Journalists and developers' },
    { name: 'S/MIME', v: 'ok', tag: 'End-to-end with certificates', pros: ['Built into Outlook and Apple Mail'], cons: ['Certificate management for everyone'], best: 'Enterprises' },
    { name: 'SPF + DKIM + DMARC', v: 'use', tag: 'Stop forged senders', pros: ['Blocks spoofing of your domain', 'DKIM signs messages'], cons: ['Easy to misconfigure', 'Doesn’t stop look-alike domains'], best: 'Every domain that sends mail' },
  ]},

  '16.2': { title: 'Messaging security', items: [
    { name: 'Signal Protocol', v: 'use', tag: 'X3DH/PQXDH + Double Ratchet', pros: ['Forward secrecy and post-compromise security', 'Battle-tested (Signal, WhatsApp)'], cons: ['Metadata still partly visible', 'Phone-based identity'], best: 'Private chats' },
    { name: 'MLS', v: 'use', tag: 'Messaging Layer Security (RFC 9420)', pros: ['Efficient for big groups', 'Interoperable standard'], cons: ['Newer; fewer deployments'], best: 'Large group chats' },
    { name: 'Server-side encryption only', v: 'legacy', tag: '“Encrypted” chats the provider can read', pros: ['Cloud sync and search are easy'], cons: ['Provider (or a breach) can read everything'], best: 'Non-sensitive chat' },
  ]},

  '16.3': { title: 'Data-at-rest encryption', items: [
    { name: 'Full-disk encryption', v: 'use', tag: 'BitLocker, FileVault, LUKS', pros: ['Protects a lost or stolen laptop', 'Transparent once unlocked'], cons: ['No protection while the device is on and unlocked', 'Recovery key must be stored safely'], best: 'Every laptop and phone' },
    { name: 'File / archive encryption', v: 'use', tag: 'age, GnuPG, encrypted ZIP', pros: ['Protects files when shared or backed up'], cons: ['Weak passwords; old ZIP crypto is weak'], best: 'Sending or archiving files' },
    { name: 'Cloud E2EE', v: 'use', tag: 'You hold the keys', pros: ['Provider can’t read your data'], cons: ['Lose the key, lose the data', 'Fewer server-side features'], best: 'Sensitive cloud backups' },
  ]},

  '16.4': { title: 'Second factors and logins', items: [
    { name: 'SMS codes', v: 'legacy', tag: 'Text message', pros: ['Works on any phone', 'Better than no 2FA'], cons: ['SIM swapping and SS7 interception', 'Phishable'], best: 'Last resort' },
    { name: 'TOTP app', v: 'ok', tag: 'HMAC of the time', pros: ['Offline; free; standard (RFC 6238)'], cons: ['Phishable in real time', 'Shared secret stored on the server'], best: 'Good default 2FA' },
    { name: 'Push approval', v: 'ok', tag: 'Tap “Approve”', pros: ['Convenient'], cons: ['MFA fatigue: users approve spam prompts'], best: 'With number matching' },
    { name: 'Passkeys / security keys', v: 'use', tag: 'WebAuthn public-key login', pros: ['Phishing-resistant (domain-bound)', 'Nothing secret stored on the server', 'Fast to use'], cons: ['Account recovery planning needed', 'Cross-device sync depends on ecosystem'], best: 'Everything that supports them' },
  ]},

  '16.5': { title: 'JWT signing algorithms', items: [
    { name: 'HS256', v: 'ok', tag: 'HMAC-SHA256', pros: ['Tiny and fast'], cons: ['Every verifier can also forge', 'Weak secrets can be brute-forced'], best: 'One service issuing and verifying' },
    { name: 'RS256 / PS256', v: 'ok', tag: 'RSA signatures', pros: ['Public verification; very widespread'], cons: ['Large tokens', 'Algorithm-confusion pitfalls'], best: 'Identity providers' },
    { name: 'ES256 / EdDSA', v: 'use', tag: 'ECDSA P-256 / Ed25519', pros: ['Small tokens; public verification'], cons: ['ES256 needs good nonces (libraries handle it)'], best: 'Modern APIs' },
    { name: 'alg: none', v: 'avoid', tag: '“No signature”', pros: ['None'], cons: ['Anyone can forge any token'], best: 'Reject it, always' },
  ]},

  '16.6': { title: 'Blockchain building blocks', items: [
    { name: 'Hash-chained blocks', v: 'idea', tag: 'Each block holds the previous hash', pros: ['Tamper-evident history'], cons: ['Doesn’t stop a majority of miners/validators'], best: 'Public ledgers, audit logs' },
    { name: 'Proof of work', v: 'idea', tag: 'Find a hash below a target', pros: ['Permissionless and simple'], cons: ['Enormous energy use'], best: 'Bitcoin' },
    { name: 'Proof of stake', v: 'idea', tag: 'Validators lock up coins', pros: ['~99.9% less energy'], cons: ['More complex security assumptions'], best: 'Ethereum since 2022' },
    { name: 'Wallet = private key', v: 'idea', tag: 'secp256k1 signatures', pros: ['You truly own your funds'], cons: ['Lose the key, lose the money; no undo'], best: 'Use hardware wallets + backups' },
  ]},

  '16.7': { title: 'Supply-chain protections', items: [
    { name: 'Code signing', v: 'use', tag: 'Sign releases and updates', pros: ['Users know who published it', 'Tampered updates fail verification'], cons: ['Stolen signing keys sign malware too'], best: 'All software distribution' },
    { name: 'Sigstore / transparency', v: 'use', tag: 'Keyless signing + public logs', pros: ['No long-lived keys to steal', 'Public audit trail'], cons: ['Depends on identity providers'], best: 'Open-source packages' },
    { name: 'Reproducible builds', v: 'use', tag: 'Anyone can rebuild bit-for-bit', pros: ['Catches compromised build servers'], cons: ['Hard to achieve'], best: 'Critical projects' },
  ]},

  '17.1': { title: 'Post-quantum algorithms', items: [
    { name: 'ML-KEM (Kyber)', v: 'use', tag: 'FIPS 203, lattices', pros: ['Fast (often faster than X25519)', 'Already deployed in hybrids'], cons: ['~1 KB keys and ciphertexts'], best: 'Key exchange' },
    { name: 'ML-DSA (Dilithium)', v: 'use', tag: 'FIPS 204, lattices', pros: ['Fast; general purpose'], cons: ['2.4–4.6 KB signatures strain certificates'], best: 'General signatures' },
    { name: 'SLH-DSA (SPHINCS+)', v: 'ok', tag: 'FIPS 205, hashes only', pros: ['Most conservative assumptions'], cons: ['Big, slow signatures'], best: 'Firmware, roots of trust' },
    { name: 'FN-DSA (Falcon)', v: 'ok', tag: 'Compact lattice signatures', pros: ['Small signatures'], cons: ['Tricky floating-point implementation'], best: 'Where size matters' },
    { name: 'HQC', v: 'ok', tag: 'Code-based KEM, selected 2025', pros: ['Different math: a backup if lattices fall'], cons: ['Larger keys; not yet standardized'], best: 'Diversity' },
    { name: 'QKD', v: 'legacy', tag: 'Quantum key distribution', pros: ['Security from physics'], cons: ['Special hardware and fiber; short range', 'Still needs authentication', 'Not recommended by most agencies'], best: 'Niche experiments' },
  ]},

  '17.2': { title: 'Zero-knowledge proofs', items: [
    { name: 'zk-SNARKs', v: 'idea', tag: 'Succinct proofs', pros: ['Tiny proofs, fast verification'], cons: ['Often need a trusted setup', 'Heavy to generate'], best: 'Blockchain privacy and scaling' },
    { name: 'zk-STARKs', v: 'idea', tag: 'Transparent proofs', pros: ['No trusted setup; hash-based (post-quantum)'], cons: ['Bigger proofs'], best: 'Rollups' },
  ]},

  '17.3': { title: 'Homomorphic encryption', items: [
    { name: 'Partially homomorphic', v: 'idea', tag: 'One operation (RSA ×, Paillier +)', pros: ['Fast and practical today'], cons: ['Only one kind of math'], best: 'E-voting tallies, simple sums' },
    { name: 'Fully homomorphic (FHE)', v: 'idea', tag: 'Any computation on ciphertext', pros: ['Cloud can compute without seeing data'], cons: ['Thousands to millions of times slower', 'Huge ciphertexts'], best: 'Specialized private analytics' },
  ]},

  '17.4': { title: 'Splitting secrets', items: [
    { name: 'Shamir secret sharing', v: 'use', tag: 'Any k of n shares', pros: ['Fewer than k shares reveal nothing', 'Survives losing up to n − k shares'], cons: ['Secret is rebuilt in one place (a moment of exposure)', 'Shares need secure storage'], best: 'Root-key backups, Vault unsealing' },
    { name: 'Single key holder', v: 'avoid', tag: 'One person, one key', pros: ['Simple'], cons: ['Single point of failure and of corruption'], best: 'Low-value secrets only' },
  ]},

  '17.5': { title: 'Distributed key use', items: [
    { name: 'MPC', v: 'idea', tag: 'Compute jointly, reveal only the result', pros: ['No party sees others’ inputs'], cons: ['Network-heavy; complex'], best: 'Private auctions, statistics' },
    { name: 'Threshold signatures', v: 'use', tag: 'The key is never in one place', pros: ['No single device can sign alone', 'Looks like one normal signature'], cons: ['Complex protocols; fewer audited libraries'], best: 'Custody wallets, CAs' },
  ]},

  '17.6': { title: 'PAKE', items: [
    { name: 'PAKE (OPAQUE, SRP, SAE)', v: 'use', tag: 'Key exchange from a password', pros: ['No offline guessing from traffic', 'Server never sees the password (OPAQUE)'], cons: ['Harder to deploy than password-over-TLS'], best: 'Wi-Fi (WPA3), password managers' },
  ]},

  '20.2': { title: 'Kinds of evidence that a scheme is secure', items: [
    { name: 'Proof in the standard model', v: 'idea', tag: 'Reduction with no idealized parts', pros: ['Strongest kind of proof', 'No “pretend the hash is magic” step'], cons: ['Schemes are often slower or bigger', 'Still only as good as the hard problem and the code'], best: 'High-assurance designs' },
    { name: 'Proof in the random oracle model', v: 'idea', tag: 'Treats the hash as a perfect random function', pros: ['Allows fast, practical schemes (RSA-OAEP, Ed25519, ML-KEM)', 'Excellent real-world track record'], cons: ['Real hashes aren’t random oracles', 'Contrived schemes exist that are “proven” yet breakable'], best: 'Most modern public-key schemes' },
    { name: 'Survived public cryptanalysis', v: 'idea', tag: 'No proof, decades of attacks (AES, SHA-2)', pros: ['Tested against every known attack technique', 'Allows very fast designs'], cons: ['A brand-new technique could appear', 'Needs ongoing, open scrutiny'], best: 'Block ciphers and hash functions' },
    { name: '“Provably unbreakable” marketing', v: 'avoid', tag: 'Claims without a published model', pros: ['None'], cons: ['No stated game, assumptions or review means no proof', 'Often a sign of home-made crypto'], best: 'Treat as a red flag' },
  ]},

  '20.3': { title: 'Cipher blueprints', items: [
    { name: 'Feistel network', v: 'ok', tag: 'Split in halves, mix one into the other', pros: ['Round function needn’t be reversible', 'Same circuit encrypts and decrypts'], cons: ['Half the block changes per round, so more rounds', 'Its famous member (DES) is retired'], best: 'DES, 3DES, Blowfish, Twofish, Camellia' },
    { name: 'SPN', v: 'use', tag: 'Substitute, permute, add key: whole block per round', pros: ['Fast diffusion, fewer rounds', 'Rich design theory (AES)'], cons: ['Needs reversible S-boxes', 'Table lookups can leak timing in software'], best: 'AES, Serpent, PRESENT' },
    { name: 'ARX', v: 'use', tag: 'Only Add, Rotate, XOR', pros: ['Fast on any CPU', 'Constant-time by nature'], cons: ['Harder to analyze', 'Needs many rounds'], best: 'ChaCha20, BLAKE2/3' },
  ]},

  '20.5': { title: 'Hiding who you talk to', items: [
    { name: 'HTTPS alone', v: 'ok', tag: 'Encrypts content', pros: ['Everywhere, automatic', 'Hides pages, forms, cookies'], cons: ['IP addresses and the site’s name still visible'], best: 'Everyday browsing' },
    { name: 'VPN', v: 'ok', tag: 'One encrypted tunnel to one provider', pros: ['Hides traffic from café Wi-Fi and your ISP', 'Fast'], cons: ['The VPN provider sees everything instead', 'One point of trust and of failure'], best: 'Untrusted networks, company access' },
    { name: 'Tor', v: 'use', tag: 'Three relays, three layers of encryption', pros: ['No single relay knows both ends', 'Onion services need no CA'], cons: ['Slower', 'Exit relay sees non-HTTPS traffic', 'Global traffic correlation is possible'], best: 'Anonymity and censorship circumvention' },
    { name: 'Plain web proxy', v: 'avoid', tag: 'Forwards requests for you', pros: ['Changes your apparent IP'], cons: ['Often unencrypted', 'The proxy sees and can change everything'], best: 'Not for privacy' },
  ]},

  '20.6': { title: 'Single sign-on standards', items: [
    { name: 'Kerberos', v: 'ok', tag: 'Tickets from a Key Distribution Center', pros: ['Password never crosses the network', 'Mature, built into Windows'], cons: ['Kerberoasting and golden tickets', 'Built for one organization’s network'], best: 'Office networks (Active Directory)' },
    { name: 'SAML 2.0', v: 'ok', tag: 'Signed XML assertions', pros: ['Supported by almost every enterprise app'], cons: ['XML signature wrapping bugs', 'Stolen signing key = Golden SAML'], best: 'Existing enterprise SSO' },
    { name: 'OAuth 2.0', v: 'use', tag: 'Delegated access tokens', pros: ['Apps never see your password', 'Limited, revocable access'], cons: ['Not a login protocol on its own', 'Many options to misconfigure'], best: 'Letting an app use an API on your behalf' },
    { name: 'OpenID Connect', v: 'use', tag: 'Signed ID token on top of OAuth', pros: ['Standard “Sign in with…”', 'JWT ID tokens anyone can verify'], cons: ['Must validate signature, issuer, audience, expiry'], best: 'Modern web and mobile login (with PKCE)' },
    { name: 'Implicit flow', v: 'avoid', tag: 'Tokens returned in the browser URL', pros: ['Simple for old single-page apps'], cons: ['Tokens leak via history, logs and referrers', 'Discouraged by RFC 9700'], best: 'Replace with code flow + PKCE' },
  ]},

  '20.7': { title: 'Ways to pay', items: [
    { name: 'Magnetic stripe', v: 'avoid', tag: 'Static data', pros: ['Works everywhere, even old terminals'], cons: ['One swipe through a skimmer = a perfect clone'], best: 'Fallback only' },
    { name: 'Chip (EMV)', v: 'use', tag: 'Fresh cryptogram per payment', pros: ['Key never leaves the chip', 'Replays fail (counter + unpredictable number)'], cons: ['Implementation flaws have let terminals accept wrong PINs', 'Weak terminal randomness enabled pre-play attacks'], best: 'In-person payments' },
    { name: 'Contactless', v: 'use', tag: 'Same cryptograms over radio', pros: ['Fast; same chip security'], cons: ['Relay attacks possible in theory', 'Spending limits without PIN'], best: 'Small everyday payments' },
    { name: 'Phone wallet (tokenized)', v: 'use', tag: 'Device token + secure element', pros: ['Real card number never stored or shared', 'Biometric check per payment'], cons: ['Depends on phone security and the platform'], best: 'Best everyday option' },
    { name: 'Typing card number online', v: 'legacy', tag: 'Card-not-present', pros: ['Universal'], cons: ['Static number can be stolen and reused', 'Needs extra checks (3-D Secure)'], best: 'With 3-D Secure or tokenized checkout' },
  ]},

  '20.8': { title: 'Device trust', items: [
    { name: 'Secure boot', v: 'use', tag: 'Verify each stage’s signature', pros: ['Blocks unsigned bootkits', 'Simple yes/no decision'], cons: ['Vulnerable signed code must be revoked (BlackLotus)', 'Can restrict installing your own OS'], best: 'Every PC and phone' },
    { name: 'Measured boot', v: 'use', tag: 'Hash every stage into TPM PCRs', pros: ['Detects any change, even signed ones', 'Can seal disk keys to known-good state'], cons: ['Legitimate updates change the values', 'Needs someone to check the measurements'], best: 'BitLocker, Linux disk unlock' },
    { name: 'Remote attestation', v: 'ok', tag: 'Prove boot state to a server', pros: ['Zero-trust device checks', 'Verify cloud enclaves before sending secrets'], cons: ['Privacy and platform lock-in concerns', 'Complex to deploy'], best: 'Company devices, confidential computing' },
  ]},

  '20.9': { title: 'Hiding vs. encrypting', items: [
    { name: 'Steganography', v: 'ok', tag: 'Hide that a message exists', pros: ['Doesn’t draw attention'], cons: ['Steganalysis detects statistical traces', 'Found = readable, unless also encrypted'], best: 'On top of encryption, never instead' },
    { name: 'Encryption', v: 'use', tag: 'Hide what a message says', pros: ['Proven, standard, strong'], cons: ['Everyone can see a secret exists'], best: 'Always' },
    { name: 'Watermarking', v: 'ok', tag: 'Hidden owner or recipient ID', pros: ['Traces leaks back to the source'], cons: ['Can sometimes be removed or forged', 'Privacy concerns (printer dots)'], best: 'Media and document leak tracing' },
  ]},

  '20.10': { title: 'The policy debate: arguments on each side', items: [
    { name: 'Exceptional access', v: 'idea', tag: 'Key escrow / lawful-access mechanisms', pros: ['Could help investigate serious crimes when data is otherwise unreadable', 'Courts could oversee each use'], cons: ['Creates a high-value key or mechanism to steal or abuse', 'History: Clipper flaw, hijacked Dual_EC at Juniper', 'Other governments will demand the same'], best: 'Hotly debated' },
    { name: 'Strong encryption by default', v: 'idea', tag: 'No one but the user holds the keys', pros: ['Protects everyone: citizens, businesses, journalists, governments', 'No master key to leak'], cons: ['Can hinder investigations (“going dark”)', 'Lost keys can mean lost data'], best: 'The default in modern phones and messengers' },
  ]},

  '18.8': { title: 'Rolling your own crypto', items: [
    { name: 'Home-made crypto', v: 'avoid', tag: '“I invented a cipher!”', pros: ['A great way to learn (in a sandbox)'], cons: ['Unreviewed; side channels; misuse', 'Experts get it wrong too'], best: 'Learning projects only' },
    { name: 'Vetted libraries', v: 'use', tag: 'libsodium, Tink, platform crypto', pros: ['Reviewed, tested, constant time', 'Safe high-level APIs'], cons: ['Must still be used correctly and kept updated'], best: 'Every production system' },
  ]},

  '19.3': { title: 'Where keys live', items: [
    { name: 'Source code', v: 'avoid', tag: 'API_KEY = "sk_live_…"', pros: ['Zero effort'], cons: ['Everyone with the repo or binary has it', 'Lives forever in Git history'], best: 'Never' },
    { name: '.env / config files', v: 'legacy', tag: 'Plain files', pros: ['Simple for development'], cons: ['Leaks via logs, backups, screenshots'], best: 'Local development' },
    { name: 'OS key stores', v: 'use', tag: 'Keychain, DPAPI, Android Keystore', pros: ['OS-protected, often hardware-backed'], cons: ['Platform-specific APIs'], best: 'Desktop and mobile apps' },
    { name: 'Secret managers', v: 'use', tag: 'Vault, AWS/GCP/Azure secrets', pros: ['Access control, audit logs, rotation'], cons: ['Another critical service to run'], best: 'Servers and pipelines' },
    { name: 'Cloud KMS', v: 'use', tag: 'Keys stay in provider HSMs', pros: ['Non-exportable; envelope encryption built in'], cons: ['Trust and lock-in to the provider', 'Per-request cost and latency'], best: 'Cloud data encryption' },
    { name: 'TPM / Secure Enclave', v: 'use', tag: 'Chip in your device', pros: ['Keys born inside, can’t be exported'], cons: ['Device loss = key loss (plan recovery)'], best: 'Disk encryption, passkeys' },
    { name: 'Security keys / smart cards', v: 'use', tag: 'YubiKey, Titan, ID cards', pros: ['Portable, tamper-resistant, needs presence'], cons: ['Can be lost; buy two'], best: 'Admins, SSH, logins' },
    { name: 'HSM', v: 'use', tag: 'FIPS 140-3 tamper-responsive box', pros: ['Strongest protection; erases keys if attacked'], cons: ['Expensive; specialist operations'], best: 'Banks, CAs, payment networks' },
  ]},

  '19.4': { title: 'Envelope encryption', items: [
    { name: 'Envelope encryption', v: 'use', tag: 'DEK per object, wrapped by a KEK', pros: ['Master key never leaves the KMS', 'Rotate the KEK without re-encrypting all data', 'Fast local bulk encryption'], cons: ['Two-level key bookkeeping', 'KMS outage = no decryption'], best: 'Cloud storage, databases' },
    { name: 'One key for everything', v: 'avoid', tag: 'A single long-lived key', pros: ['Simple'], cons: ['One leak exposes all data', 'Rotation means re-encrypting everything'], best: 'Nowhere serious' },
  ]},

  '19.7': { title: 'Recovery strategies', items: [
    { name: 'Key escrow', v: 'ok', tag: 'Organization keeps recovery keys', pros: ['IT can recover a forgotten laptop'], cons: ['The escrow store becomes a juicy target'], best: 'Company devices' },
    { name: 'Offline backup', v: 'use', tag: 'Printed codes in a safe place', pros: ['Immune to online attacks'], cons: ['Fire, loss, and forgetting where it is'], best: 'Individuals' },
    { name: 'No recovery (true E2EE)', v: 'ok', tag: 'Lose the key, lose the data', pros: ['Nobody else can ever get in'], cons: ['Nobody can help you either'], best: 'When privacy matters most' },
  ]},
};
