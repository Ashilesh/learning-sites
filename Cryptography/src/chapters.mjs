// Per-chapter "hook" data: the curiosity question, emoji, key fragment and the boss-battle quiz.
// Quiz format: { q, o: [options...], a: indexOfCorrect, why }
// Everything here supports the content in ../Cryptography-Guide.md (the single source of truth).

export const WORLDS = {
  I:   { n: 1, name: 'Foundations',             emoji: '🏝️', color: 'sun' },
  II:  { n: 2, name: 'The Building Blocks',     emoji: '🧱', color: 'coral' },
  III: { n: 3, name: 'Trust on the Internet',   emoji: '🌐', color: 'ocean' },
  IV:  { n: 4, name: 'Crypto in the Real World',emoji: '🏙️', color: 'mint' },
  V:   { n: 5, name: 'Going Deeper',            emoji: '🔭', color: 'orange' },
  VI:  { n: 6, name: 'Reference',               emoji: '📚', color: 'grape' },
};

export const CHAPTERS = {
  1: {
    emoji: '🔐', fragment: 'alice',
    hook: 'Your card number crosses café Wi-Fi, routers and a dozen strangers’ computers. So why can’t any of them read it?',
    quiz: [
      { q: 'Encryption on its own gives you which goal?', o: ['Confidentiality only', 'Confidentiality and integrity', 'All five goals', 'Non-repudiation'], a: 0, why: 'A perfectly secret message can still be modified, replayed or sent by an impostor. Real systems combine several tools.' },
      { q: 'What can Mallory do that Eve can’t?', o: ['Only listen', 'Listen, block, modify, replay and inject messages', 'Issue certificates', 'Nothing, they are the same'], a: 1, why: 'Eve is a passive eavesdropper. Mallory is an active attacker, and on the internet you should assume she is on the line.' },
      { q: '<code>SGVsbG8sIFdvcmxkIQ==</code> is…', o: ['AES ciphertext', 'A SHA-256 hash', 'Base64 encoding that anyone can decode', 'A private key'], a: 2, why: 'It is just “Hello, World!” in Base64. Encoding changes the format and gives zero security.' },
      { q: 'Kerckhoffs’s principle says a cryptosystem should stay secure even if…', o: ['the key leaks', 'everything except the key is public', 'nobody knows the algorithm', 'attackers have unlimited time'], a: 1, why: 'The lock design is public; only the key is secret. Security through obscurity eventually fails.' },
    ],
  },
  2: {
    emoji: '🏛️', fragment: 'caesar',
    hook: 'A cipher with 400 septillion possible keys was cracked in the 9th century, with pen and paper. How?',
    quiz: [
      { q: 'How many useful keys does a Caesar cipher have?', o: ['3', '25', '26!', '256'], a: 1, why: 'Only 25 shifts are possible, so an attacker just tries them all: a brute-force attack.' },
      { q: 'Al-Kindi broke substitution ciphers using…', o: ['brute force', 'frequency analysis', 'an early computer', 'a stolen key'], a: 1, why: 'Letters like E, T, A, O appear more often in English. Patterns in the plaintext leak into the ciphertext.' },
      { q: 'Why did the Vigenère cipher eventually fall?', o: ['Its keyword repeats', 'It only used 10 letters', 'The key was printed in newspapers', 'It encrypted letters as themselves'], a: 0, why: 'Repetition is the enemy. Find the keyword length and each group is just a Caesar cipher.' },
      { q: 'The Venona project decrypted Soviet one-time-pad messages because…', o: ['the pads were too short', 'some pad pages were printed twice', 'Enigma leaked them', 'the pads were not random'], a: 1, why: '“One-time” really means one time. Reusing a pad destroys its perfect secrecy.' },
    ],
  },
  3: {
    emoji: '🧮', fragment: 'modulo',
    hook: '5⁶ mod 23 takes a split second to compute. Running it backwards, with big numbers, would outlast the universe. Welcome to the one-way street that guards the internet.',
    quiz: [
      { q: 'One byte is written as how many hex characters?', o: ['1', '2', '4', '8'], a: 1, why: 'Each hex symbol stands for 4 bits, so 8 bits = 2 hex characters. A 256-bit value is 64 hex characters.' },
      { q: '(M ⊕ K) ⊕ K equals…', o: ['K', '0', 'M', 'M ⊕ K'], a: 2, why: 'XOR-ing with the same key twice gets you back where you started. Encryption and decryption are the same operation.' },
      { q: '17 mod 5 = ?', o: ['2', '3', '12', '0'], a: 0, why: '17 = 3 × 5 + 2, so the remainder is 2.' },
      { q: 'For 128-bit security an elliptic-curve key is ~256 bits. How big must an RSA key be?', o: ['256 bits', '1024 bits', '3072 bits', '15360 bits'], a: 2, why: 'RSA keys grow enormously while ECC keys grow gently. That is why the world is moving to elliptic curves.' },
    ],
  },
  4: {
    emoji: '🎲', fragment: 'entropy',
    hook: 'A 256-bit key can secretly have the strength of a 15-bit one. Two deleted lines of code did exactly that to a whole operating system’s keys for two years.',
    quiz: [
      { q: 'Which should generate a password-reset token in Python?', o: ['random.randint()', 'the secrets module', 'time.time()', 'hash(username)'], a: 1, why: 'Use the OS CSPRNG (secrets, os.urandom). Python’s random module is predictable.' },
      { q: 'After how many outputs can an attacker predict Python’s Mersenne Twister?', o: ['2', '624', 'a million', 'never'], a: 1, why: 'After 624 observed outputs, every future output is predictable. Great for games, terrible for tokens.' },
      { q: 'A nonce must…', o: ['always be secret', 'never repeat with the same key', 'be a password', 'be exactly 1 byte'], a: 1, why: 'Nonces are sent openly. Their job is uniqueness: the same input must never produce the same output twice.' },
      { q: 'Hackers recovered Sony’s PS3 signing key because Sony…', o: ['used 512-bit RSA', 'used the same random number in every ECDSA signature', 'used MD5', 'printed the key in a manual'], a: 1, why: 'ECDSA needs a fresh random number per signature. Two signatures with the same one reveal the private key.' },
    ],
  },
  5: {
    emoji: '🔑', fragment: 'rijndael',
    hook: 'An attacker who doesn’t know the key changes “$100” into “$900”, and the bank’s decryption raises no alarm at all. How is that even possible?',
    quiz: [
      { q: 'Which mode lets you still see the picture after encryption?', o: ['GCM', 'CTR', 'ECB', 'CBC'], a: 2, why: 'ECB encrypts identical blocks identically, so patterns survive. Never use it.' },
      { q: 'GCM = CTR mode plus…', o: ['an authentication tag', 'padding', 'a bigger key', 'compression'], a: 0, why: 'GCM is an AEAD: CTR for secrecy plus a 16-byte tag that detects any tampering.' },
      { q: 'Reusing a nonce with the same AES-GCM key…', o: ['is harmless', 'only slows it down', 'reveals the XOR of the messages and allows forgeries', 'makes the key longer'], a: 2, why: 'Nonce reuse in GCM is catastrophic. Use counters, random 96-bit nonces with key rotation, XChaCha20 or AES-GCM-SIV.' },
      { q: 'How many rounds does AES use with a 256-bit key?', o: ['10', '12', '14', '16'], a: 2, why: '10 rounds for 128-bit keys, 12 for 192-bit, 14 for 256-bit.' },
    ],
  },
  6: {
    emoji: '🫆', fragment: 'avalanche',
    hook: 'Change one letter in a 4 GB movie and its fingerprint changes completely. Find two files with the same fingerprint and you can fake a Windows Update. 😱',
    quiz: [
      { q: 'How many people do you need for a >50% chance that two share a birthday?', o: ['23', '183', '365', '50'], a: 0, why: '23 people make 253 pairs. That is why collisions appear after about 2^(n/2) tries.' },
      { q: 'SHA-256’s collision resistance is about…', o: ['2³²', '2⁶⁴', '2¹²⁸', '2²⁵⁶'], a: 2, why: 'The birthday paradox halves the exponent: 256-bit output → 128-bit collision security.' },
      { q: 'Which of these is broken for security?', o: ['SHA-256', 'SHA-3', 'SHA-1', 'BLAKE3'], a: 2, why: 'SHAttered (2017) produced two PDFs with the same SHA-1 hash. MD5 is broken too.' },
      { q: 'To prove item C is in a 4-leaf Merkle tree you share…', o: ['all the data', 'only the root', 'H4 and H12', 'nothing'], a: 2, why: 'With H(C), H4 and H12 the verifier can recompute the root without seeing A, B or D.' },
    ],
  },
  7: {
    emoji: '🧷', fragment: 'seal',
    hook: 'Mallory can change a message AND recompute its hash. So how does your server know a webhook really came from GitHub?',
    quiz: [
      { q: 'Why is hash(key + message) a bad MAC?', o: ['It is too slow', 'Length-extension attacks', 'It needs a public key', 'It is not deterministic'], a: 1, why: 'With Merkle–Damgård hashes, an attacker can append data and compute a valid hash without the key. Use HMAC.' },
      { q: 'Comparing tags with a normal == is risky because…', o: ['it is slow', 'it leaks timing, byte by byte', 'it ignores case', 'it uses floating point'], a: 1, why: 'An early mismatch returns faster. Use constant-time comparison like hmac.compare_digest.' },
      { q: 'The correct way to combine a cipher and a MAC is…', o: ['MAC-then-Encrypt', 'Encrypt-and-MAC', 'Encrypt-then-MAC', 'Hash-then-Encode'], a: 2, why: 'Encrypt-then-MAC rejects tampered data before decrypting. Better still: use an AEAD.' },
      { q: 'What can a MAC NOT give you?', o: ['Integrity', 'Authenticity', 'Non-repudiation', 'Tamper detection'], a: 2, why: 'Both sides hold the same key, so Bob could have made the tag himself. For public proof you need a signature.' },
    ],
  },
  8: {
    emoji: '🧂', fragment: 'salt',
    hook: 'Hackers just stole your website’s password database. Whether that’s a shrug or a catastrophe depends on one choice you made years ago.',
    quiz: [
      { q: 'Best choice for storing user passwords today?', o: ['SHA-256', 'AES encryption', 'Argon2id', 'MD5 with a salt'], a: 2, why: 'Slow, salted, memory-hard password hashing. Argon2id is first choice; scrypt and bcrypt are fine.' },
      { q: 'A salt is…', o: ['a secret stored in an HSM', 'random, unique per user, stored next to the hash', 'the user’s password hint', 'an encryption key'], a: 1, why: 'It is not secret. Its job is to make every hash unique so nothing can be precomputed.' },
      { q: 'Four random Diceware words give about how much entropy?', o: ['13 bits', '52 bits', '128 bits', '8 bits'], a: 1, why: 'Each word from a 7,776-word list adds ~12.9 bits; 4 × 12.9 ≈ 52.' },
      { q: 'HKDF is designed for…', o: ['hashing passwords', 'expanding an already-strong secret into several keys', 'encrypting files', 'signing documents'], a: 1, why: 'Extract, then Expand with different labels. Passwords need slow KDFs like Argon2 instead.' },
    ],
  },
  9: {
    emoji: '🗝️', fragment: 'trapdoor',
    hook: 'For 3,000 years, sharing a secret meant meeting first. Then someone invented a padlock anyone can snap shut, but only you can open.',
    quiz: [
      { q: 'Toy RSA with p = 61 and q = 53. What is n?', o: ['3120', '3233', '114', '2753'], a: 1, why: 'n = p × q = 3233 is public. φ = 60 × 52 = 3120 stays secret.' },
      { q: 'Who can decrypt a message encrypted with Bob’s public key?', o: ['Anyone', 'Only Bob, with his private key', 'Alice, who encrypted it', 'The certificate authority'], a: 1, why: 'Once the padlock snaps shut, even Alice can’t reopen the box.' },
      { q: 'Why do real systems use hybrid encryption?', o: ['RSA cannot decrypt', 'Public-key crypto is slow and handles tiny data, so it wraps an AES key', 'AES is insecure', 'For legal reasons'], a: 1, why: 'Send the heavy safe by ordinary post (AES) and its small key in an envelope only Bob can open (public key).' },
      { q: 'Which RSA encryption padding should you use?', o: ['None (textbook RSA)', 'PKCS#1 v1.5', 'OAEP', 'ECB'], a: 2, why: 'RSA-OAEP. PKCS#1 v1.5 encryption is vulnerable to Bleichenbacher-style attacks (ROBOT).' },
    ],
  },
  10: {
    emoji: '🎨', fragment: 'paint',
    hook: 'Two strangers shout numbers across a crowded room, and end up sharing a secret that nobody else in the room can work out.',
    quiz: [
      { q: 'p = 23, g = 5, Alice picks a = 6, Bob picks b = 15. The shared secret is…', o: ['8', '19', '2', '23'], a: 2, why: 'A = 8, B = 19. Alice: 19⁶ mod 23 = 2. Bob: 8¹⁵ mod 23 = 2.' },
      { q: 'Unauthenticated Diffie-Hellman is vulnerable to…', o: ['a man in the middle', 'birthday collisions', 'padding oracles', 'length extension'], a: 0, why: 'Mallory runs one exchange with Alice and another with Bob. Authentication (signatures, certificates) stops her.' },
      { q: 'Forward secrecy comes from…', o: ['longer RSA keys', 'ephemeral keys deleted after the session', 'certificates', 'SHA-512'], a: 1, why: 'If the temporary keys are gone, stealing the long-term key later cannot decrypt old recordings.' },
      { q: 'X25519MLKEM768 combines…', o: ['two RSA keys', 'classical X25519 with post-quantum ML-KEM', 'AES and SHA-256', 'Ed25519 and RSA'], a: 1, why: 'A hybrid: an attacker must break both. It is on by default in Chrome, Edge, Firefox and OpenSSL 3.5+.' },
    ],
  },
  11: {
    emoji: '✍️', fragment: 'ink',
    hook: 'How can anyone on Earth check that a file came from you, without being able to forge your signature themselves?',
    quiz: [
      { q: 'You sign with your ___ key; others verify with your ___ key.', o: ['public / private', 'private / public', 'shared / shared', 'session / master'], a: 1, why: 'Only you can make the seal, but everyone can check it.' },
      { q: 'Toy RSA: Bob signs hash 65 and gets s = 588. Verification computes 588¹⁷ mod 3233 = ?', o: ['588', '65', '2753', '17'], a: 1, why: 'It returns the hash 65, which matches, so the signature is valid.' },
      { q: 'Why can’t Ed25519 make the PlayStation 3 mistake?', o: ['It uses RSA internally', 'It derives the per-signature nonce deterministically', 'Its keys are longer', 'It skips hashing'], a: 1, why: 'There is no random number to get wrong: k comes from the private key and the message.' },
      { q: 'Which one gives non-repudiation?', o: ['SHA-256', 'HMAC-SHA256', 'AES-GCM', 'A digital signature'], a: 3, why: 'Only the private-key holder could have produced it, and anyone can verify it.' },
    ],
  },
  12: {
    emoji: '📮', fragment: 'packet',
    hook: 'Your messages are chopped into postcards and passed hand to hand by 10 to 20 strangers in different countries. What can each of them read?',
    quiz: [
      { q: 'Which port do web servers use for HTTPS?', o: ['80', '22', '443', '53'], a: 2, why: 'Port 443 (TCP, and UDP for HTTP/3). Port 80 is plain, unencrypted HTTP.' },
      { q: 'Which gives reliable, ordered delivery with a three-way handshake?', o: ['UDP', 'TCP', 'DNS', 'QUIC'], a: 1, why: 'TCP: SYN, SYN-ACK, ACK. UDP is fire-and-forget (used by DNS, WireGuard and QUIC).' },
      { q: 'DNS is…', o: ['the internet’s phone book: names → IP addresses', 'an encryption protocol', 'a type of certificate', 'a VPN'], a: 0, why: 'Classic DNS is unencrypted and unauthenticated, which is why DNSSEC, DoT and DoH exist.' },
      { q: 'With plain HTTPS, what can the café Wi-Fi still see?', o: ['Your password', 'The page path and cookies', 'The domain name and IP addresses (plus data size and timing)', 'Nothing at all'], a: 2, why: 'Contents, paths and cookies are hidden, but IPs, the domain (via DNS and SNI) and traffic volume are visible.' },
    ],
  },
  13: {
    emoji: '🪪', fragment: 'chain',
    hook: 'Anyone can generate a key and claim to be your bank. So who vouches that this key really belongs to bank.com?',
    quiz: [
      { q: 'A browser trusts a certificate when its chain leads up to…', o: ['any intermediate CA', 'a root CA in its trust store', 'the website itself', 'a DNS server'], a: 1, why: 'Leaf → intermediate → root. The root is pre-installed in your OS or browser.' },
      { q: 'The padlock icon means…', o: ['the site is trustworthy', 'the connection is encrypted to the domain shown', 'it is an EV certificate', 'no phishing is possible'], a: 1, why: 'Phishing sites get free DV certificates too. Always check the domain name.' },
      { q: 'From March 2026, the maximum lifetime of a public TLS certificate is…', o: ['5 years', '398 days', '200 days', '47 days'], a: 2, why: '200 days now, 100 days in 2027 and 47 days in 2029 (planned).' },
      { q: 'Certificate Transparency logs are built as…', o: ['Merkle trees', 'blockchains', 'spreadsheets', 'encrypted databases'], a: 0, why: 'Append-only hash trees, so anyone can check that a certificate was logged.' },
    ],
  },
  14: {
    emoji: '🤝', fragment: 'handshake',
    hook: 'In about 100 milliseconds, your browser and a server on another continent run almost everything from Chapters 4 to 13. Let’s watch it happen in slow motion.',
    quiz: [
      { q: 'Which handshake message proves the server holds its certificate’s private key?', o: ['ClientHello', 'ServerHello', 'CertificateVerify', 'EncryptedExtensions'], a: 2, why: 'A signature over the whole handshake. Mallory can copy the certificate but can’t make this signature.' },
      { q: 'In TLS_AES_256_GCM_SHA384, what is SHA-384 used for?', o: ['Bulk encryption', 'HKDF and the transcript hash', 'The certificate signature', 'Compression'], a: 1, why: 'TLS 1.3 suites name only the AEAD and the hash for key derivation.' },
      { q: 'A full TLS 1.3 handshake takes how many round trips?', o: ['0', '1', '2', '3'], a: 1, why: 'One round trip (TLS 1.2 needed two). Resumption with 0-RTT can send data immediately.' },
      { q: 'HSTS protects against…', o: ['quantum computers', 'being downgraded to plain HTTP', 'expired certificates', 'weak passwords'], a: 1, why: 'It tells the browser: always use HTTPS for this site, even if someone links to http://.' },
    ],
  },
  15: {
    emoji: '🚇', fragment: 'tunnel',
    hook: 'SSH, VPNs, Wi-Fi and DNS look like four different worlds. Underneath, they’re the same handful of building blocks snapped together in different shapes.',
    quiz: [
      { q: 'How does SSH usually decide to trust a server the first time?', o: ['A certificate authority', 'Trust on first use (TOFU)', 'Web of trust', 'It doesn’t check'], a: 1, why: 'It remembers the host key fingerprint and warns loudly if it ever changes.' },
      { q: 'WireGuard avoids downgrade attacks because…', o: ['it uses RSA-4096', 'it has no algorithm negotiation', 'it is closed source', 'it uses TCP'], a: 1, why: 'Every connection uses the same fixed modern algorithms. Changing them means a new protocol version.' },
      { q: 'WPA3-Personal’s SAE handshake stops…', o: ['evil-twin access points', 'offline password guessing', 'all attacks forever', 'DNS spoofing'], a: 1, why: 'SAE is a PAKE: every guess needs a live exchange with the router, and it adds forward secrecy.' },
      { q: 'DNSSEC gives DNS answers…', o: ['privacy', 'authenticity (signatures)', 'compression', 'speed'], a: 1, why: 'DNSSEC signs answers. Privacy comes from DNS over TLS or DNS over HTTPS.' },
    ],
  },
  16: {
    emoji: '📱', fragment: 'passkey',
    hook: 'Your 6-digit authenticator code is an HMAC of the clock. Your passkey is a private key inside a chip. And a bitcoin is, at heart, just a signature.',
    quiz: [
      { q: 'A TOTP code is an HMAC of…', o: ['your password', 'a shared secret and the current 30-second time step', 'your phone number', 'your IP address'], a: 1, why: 'HMAC-SHA1(secret, time ÷ 30), shortened to 6 digits.' },
      { q: 'JWT payloads are…', o: ['encrypted', 'signed but readable by anyone', 'hashed passwords', 'random noise'], a: 1, why: 'Signed is not encrypted. Never put secrets in a JWT payload (use JWE if you must hide it).' },
      { q: 'Why are passkeys phishing-resistant?', o: ['They are longer passwords', 'They are bound to the real site’s domain and the private key never leaves your device', 'They use SMS', 'They use CAPTCHAs'], a: 1, why: 'A fake site gets nothing it can use: the signature is tied to the genuine origin.' },
      { q: 'A DMARC policy of <code>p=reject</code> tells receivers to…', o: ['encrypt the mail', 'reject mail that fails SPF/DKIM alignment', 'sign every email', 'mark everything as spam'], a: 1, why: 'SPF, DKIM and DMARC work together to stop forged senders.' },
    ],
  },
  17: {
    emoji: '⚛️', fragment: 'lattice',
    hook: 'A machine that doesn’t fully exist yet already threatens secrets you send today. Plus: how to prove you know a secret without revealing a single bit of it.',
    quiz: [
      { q: 'Shor’s algorithm on a big quantum computer would break…', o: ['AES-256', 'SHA-256', 'RSA and elliptic-curve crypto', 'one-time pads'], a: 2, why: 'Factoring and discrete logs fall. Symmetric crypto only needs bigger keys (Grover).' },
      { q: 'ML-KEM (Kyber) is based on…', o: ['factoring', 'lattice problems', 'hash functions only', 'elliptic curves'], a: 1, why: 'Finding a hidden point in a huge, noisy multi-dimensional grid. FIPS 203, August 2024.' },
      { q: 'In a 3-of-5 Shamir scheme, what do 2 shares reveal about the secret?', o: ['Two-thirds of it', 'Its first digits', 'Nothing at all', 'Everything'], a: 2, why: 'Infinitely many curves pass through 2 points. Fewer than k shares reveal nothing.' },
      { q: '“Harvest now, decrypt later” means…', o: ['recording encrypted traffic today to decrypt with a future quantum computer', 'collecting passwords', 'mining bitcoin', 'caching TLS sessions'], a: 0, why: 'That is why long-lived secrets need post-quantum key exchange now.' },
    ],
  },
  18: {
    emoji: '💥', fragment: 'oracle',
    hook: 'The math almost never breaks. A missing length check, one duplicated line of code, a signature made of zeros… those do.',
    quiz: [
      { q: 'Heartbleed (2014) was…', o: ['a weak RSA key', 'a missing length check that leaked server memory', 'an MD5 collision', 'a quantum attack'], a: 1, why: 'Implementation bugs bypass all the math. Private keys leaked from memory.' },
      { q: 'The defense against replay attacks is…', o: ['bigger keys', 'nonces, timestamps or sequence numbers', 'Base64', 'a faster hash'], a: 1, why: 'Make every valid message usable only once.' },
      { q: 'How do you defeat padding-oracle attacks?', o: ['Use AEAD and never reveal why decryption failed', 'Use ECB', 'Use longer passwords', 'Compress first'], a: 0, why: 'Uniform errors plus authenticated encryption leave the attacker nothing to measure.' },
      { q: 'Apple’s “goto fail” bug teaches…', o: ['use RSA', 'test the failure paths', 'avoid Wi-Fi', 'use MD5'], a: 1, why: 'One duplicated line skipped the certificate signature check entirely.' },
    ],
  },
  19: {
    emoji: '🗄️', fragment: 'envelope',
    hook: 'Strong crypto turns a data-protection problem into a key-protection problem. So where do you hide the one key that protects everything?',
    quiz: [
      { q: 'In envelope encryption, the data key (DEK) is…', o: ['stored in plaintext next to the data', 'encrypted by a key-encryption key (KEK), usually in a KMS', 'emailed to admins', 'derived from the file name'], a: 1, why: 'Keys protect keys. The master key never leaves the KMS or HSM.' },
      { q: 'The strongest place for a private key is…', o: ['the source code', 'a .env file', 'non-exportable secure hardware (HSM, TPM, Secure Enclave)', 'a shared spreadsheet'], a: 2, why: 'Attackers might use the key while they have access, but can never copy it.' },
      { q: 'Key separation means…', o: ['one key per purpose, derived with a KDF', 'splitting a key into halves', 'storing keys in two places', 'two people per key'], a: 0, why: 'If one use is compromised, the others stay safe.' },
      { q: 'The backup trade-off: the better the protection…', o: ['the faster it is', 'the easier it is to lose data forever', 'the cheaper it is', 'the less you need backups'], a: 1, why: 'Escrow recovery keys (organizations) or store them offline (individuals).' },
    ],
  },
  20: {
    emoji: '🔭', fragment: 'onion',
    hook: 'You know which tools to use. Now meet the games that define “secure”, the tricks that break ciphers, and the hidden crypto inside Tor, “Sign in with Google”, your bank card and your laptop’s boot screen.',
    quiz: [
      { q: 'In the IND-CPA game, why does every deterministic encryption scheme lose?', o: ['Its keys are too short', 'The attacker asks for an encryption of M0 and compares it with the challenge', 'It leaks the message length', 'It has no MAC'], a: 1, why: 'Same message, same ciphertext: the attacker wins every time. That is why real encryption needs a random IV or a unique nonce (and why ECB fails).' },
      { q: 'In a Feistel network, the round function F…', o: ['must be reversible', 'doesn’t need to be reversible: decryption runs the same rounds with the keys in reverse order', 'is only used when decrypting', 'must be a public-key operation'], a: 1, why: 'XOR-ing the same F output twice cancels out, so F can even be a one-way hash. DES is built this way.' },
      { q: 'What does a Tor middle relay know?', o: ['Who you are', 'Which website you’re visiting', 'Only the previous relay and the next relay', 'Your password'], a: 2, why: 'Each relay peels one layer of encryption and learns only the next hop. Only the guard sees you; only the exit sees the website.' },
      { q: 'On its own, OAuth 2.0 is…', o: ['a login protocol', 'a way to grant an app access to an account (authorization); OpenID Connect adds login', 'an encryption algorithm', 'a password hash'], a: 1, why: 'Use OpenID Connect (signed ID tokens) for “Sign in with…”, plus the authorization code flow with PKCE.' },
      { q: 'Why can’t a skimmer clone a chip card the way it clones a magnetic stripe?', o: ['Chips are waterproof', 'Every payment needs a fresh cryptogram made with a key that never leaves the chip', 'Chip cards have no card number', 'Terminals scan fingerprints'], a: 1, why: 'The ARQC is a MAC over the amount, a fresh unpredictable number and a counter. Copied data can’t produce a new one, and old ones can’t be replayed.' },
    ],
  },
  21: {
    emoji: '📋', fragment: 'toolbox',
    hook: 'Everything you’ve learned, boiled down to one page you could stick on your fridge.',
    quiz: [
      { q: 'You need to encrypt data with a shared key. Use…', o: ['AES-ECB', 'AES-256-GCM or ChaCha20-Poly1305', 'RC4', 'Base64'], a: 1, why: 'An AEAD. XChaCha20-Poly1305 if you want random nonces.' },
      { q: 'You need to store user passwords. Use…', o: ['SHA-256', 'Argon2id', 'AES', 'MD5'], a: 1, why: 'scrypt or bcrypt are fine; PBKDF2 with 600,000+ iterations if FIPS is required.' },
      { q: 'You need to sign data. First choice?', o: ['Ed25519', 'DSA', 'RSA-1024', 'HMAC'], a: 0, why: 'Ed25519 or ECDSA P-256. RSA-PSS 3072+ where RSA is required; ML-DSA for post-quantum.' },
      { q: 'Which belongs on the “avoid” list?', o: ['TLS 1.3', 'X25519', 'Static RSA key exchange', 'HKDF'], a: 2, why: 'No forward secrecy. Use ECDHE / X25519 instead.' },
    ],
  },
  22: {
    emoji: '📖', fragment: 'cypherpunk',
    hook: 'Every term in the guide, decoded. Flip the flashcards and find out how many you know cold.',
    quiz: [
      { q: 'AEAD stands for…', o: ['Advanced Encryption And Decryption', 'Authenticated Encryption with Associated Data', 'Asymmetric Elliptic Algorithm Design', 'Automatic Encrypted Archive Data'], a: 1, why: 'Encryption that also detects tampering: AES-GCM, ChaCha20-Poly1305.' },
      { q: 'A CSPRNG is…', o: ['a certificate format', 'a cryptographically secure pseudo-random number generator', 'a cipher suite', 'a key-exchange protocol'], a: 1, why: 'Seeded with true randomness and unpredictable even after lots of output.' },
      { q: 'A KEM…', o: ['generates a fresh secret and wraps it for someone’s public key', 'hashes passwords', 'signs certificates', 'compresses traffic'], a: 0, why: 'Key Encapsulation Mechanism. ML-KEM is the post-quantum one.' },
      { q: 'Forward secrecy means…', o: ['keys move forward in time', 'stealing a long-term key later can’t decrypt past sessions', 'messages are sent faster', 'certificates renew automatically'], a: 1, why: 'Ephemeral keys are deleted after each session.' },
    ],
  },
};

// The message locked in the vault. It is encrypted at build time with a key derived
// (PBKDF2-SHA256) from all fragments (one per chapter) joined with "-".
export const VAULT_MESSAGE = `🎉 You opened the vault!

You just used PBKDF2 (Chapter 8) to stretch 22 words into a 256-bit key, and AES-256-GCM (Chapter 5) to decrypt and authenticate this message, right inside your browser.

Remember the oldest rule of the craft: everything is public except the key.

Welcome to the club, Cryptographer. 🦄`;
