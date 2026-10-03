# Evidence — ML-DSA / FIPS 204 (trước khi implement)

> **Quy tắc của dự án:** mọi số liệu, thuật toán, hành vi API trong tài liệu này đều có nguồn
> (trang FIPS 204 hoặc script test chạy thật trên máy này). Không có mục nào suy đoán.
> File này là nguồn sự thật duy nhất cho phần crypto; code implement phải khớp với nó.

**Status:** evidence gathering — CHƯA implement sản phẩm.
**Cập nhật lần cuối:** 2026-10-02

---

## 1. Nguồn chuẩn (primary sources)

| Nguồn | URL | Kiểm chứng |
|---|---|---|
| FIPS 204 final PDF (65 trang) | https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.204.pdf | SHA-256 `57239B9F84C03227EDA3CA0991204DC7764C79AF9CE2E6824EDA774918D46B6B` |
| Trang xuất bản | https://csrc.nist.gov/pubs/fips/204/final | Ngày phát hành 2024-08-13; Planning Note 07/31/2026 trỏ tới errata |
| Errata spreadsheet (cập nhật 7/31/2026) | https://csrc.nist.gov/files/pubs/fips/204/final/docs/fips-204-potential-updates.xlsx | SHA-256 `5BC93CE63BC647E6D1D456CB2D3A171426C15ACA4A7A0E0EDD40D08B7A34C793` |

Text trích xuất từ PDF (để tra cứu): `C:\Users\ngoan\AppData\Local\Temp\opencode\fips204.txt`
(kèm marker `===== PAGE n =====` — số trang PDF = số trang tài liệu in).

### 1.1 Kết luận về errata (đã đọc toàn bộ spreadsheet)

Nguyên văn NIST: *"Potential corrections DO NOT introduce new technical requirements.
Potential corrections ARE NOT official changes."*

Các mục trong errata (10 dòng, 2024-09-20 → 2026-02-23) đều là lỗi chính tả/định dạng/biểu thức:
- Eq. (2.1)/(7.1): `ζ_j = w(ζ^{2BitRev8(i)+1}) mod q` → đúng là `ζ_j = ζ^{2BitRev8(i)+1} mod q` (w không cần evaluate) — **typo công thức NTT, không đổi kết quả tính toán**.
- Sec 6.2/6.3: văn bản viết `M` chỗ đúng ra là `M'`.
- Sec 3.3: `c̃` nên là `μ || w1` (đúng như Algorithm 7), không phải `w1 || μ`.
- Sec 5.3 Alg. 3 step 2: return `false` thay vì `⊥`.
- `NULL` → `⊥` trong Algorithms 1/2/4; link nội; bold vector; App. A Montgomery rewrite.
→ **Không có thay đổi nào ảnh hưởng tới kích thước khoá/chữ ký hay thuật toán ký/xác minh mà demo sử dụng.**

---

## 2. Thuật toán — trích chính xác từ FIPS 204 (theo trang)

### 2.1 Ba hàm chính (§3, tr. 9)

- `ML-DSA.KeyGen()` — Algorithm 1 (tr. 17)
- `ML-DSA.Sign(sk, M, ctx)` — Algorithm 2 (tr. 18)
- `ML-DSA.Verify(pk, M, σ, ctx)` — Algorithm 3 (tr. 18)
- Bản pre-hash: `HashML-DSA.Sign/Verify` — Algorithms 4/5 (tr. 20–21). **Demo chỉ cần bản "pure" ML-DSA** (§5.4: *"In general, the 'pure' ML-DSA version is preferred."*).

### 2.2 Bảng tham số — Table 1 (tr. 15), nguyên văn

| Parameter | ML-DSA-44 | ML-DSA-65 | ML-DSA-87 |
|---|---|---|---|
| q (modulus) | 8380417 | 8380417 | 8380417 |
| ζ (512th root of unity) | 1753 | 1753 | 1753 |
| d (dropped bits) | 13 | 13 | 13 |
| τ (±1's in c) | 39 | 49 | 60 |
| λ (collision strength) | 128 | 192 | 256 |
| γ1 | 2^17 | 2^19 | 2^19 |
| (k, ℓ) — dims of A | (4,4) | (6,5) | (8,7) |
| η | 2 | 4 | 2 |
| ω (max 1's in hint) | 80 | 55 | 75 |
| Claimed security category | 2 | 3 | 5 |
| Expected sign-loop repetitions | 4.25 | 5.1 | 3.85 |

### 2.3 Kích thước — Table 2 (tr. 16), nguyên văn, **đã verify empirical**

| | Private Key | Public Key | Signature |
|---|---|---|---|
| ML-DSA-44 | 2560 | 1312 | 2420 |
| ML-DSA-65 | 4032 | 1952 | 3309 |
| ML-DSA-87 | 4896 | 2592 | 4627 |

### 2.4 Chuỗi context và domain separation

- `ctx` là byte string **≤ 255 byte**; dài hơn → Sign/Verify trả `⊥`/`false` (Alg. 2 dòng 1–4, Alg. 3 dòng 1–4).
- Bản pure: `M' = BytesToBits(IntegerToBytes(0,1) ‖ IntegerToBytes(|ctx|,1) ‖ ctx) ‖ M`
  (Alg. 2 dòng 10, tr. 18 — **byte domain separator = 0**).
- Bản pre-hash: domain separator = **1**, thêm DER-encoding của OID hash function (Alg. 4 dòng 23).
- Mặc định `ctx` là chuỗi rỗng (chú thích 4, tr. 17).

### 2.5 Yêu cầu implementation (§3.6, tr. 12–13) — những gì demo PHẢI tôn trọng

1. **§3.6.1 Randomness:** seed ξ (32 byte) phải là giá trị random tươi từ RBG đạt chuẩn.
   ML-DSA-44: RBG ≥ 128-bit strength (≥ 192-bit để giữ category 2); ML-DSA-65: ≥ 192-bit;
   ML-DSA-87: ≥ 256-bit.
2. **§3.6.2 Length checks (BẮT BUỘC):** *"If an implementation of ML-DSA can accept inputs for σ or pk
   of any other length, it shall return false whenever the lengths … differ."*
   →验 verify sai độ dài pk/sig ⇒ **false**, không được proceed. Lý do: *"Failing to check the length
   of pk or σ may interfere with the security properties … like strong unforgeability."*
3. **§3.6.3 Intermediate values:** dữ liệu nhạy cảm (seed ξ, thông tin trung gian khi ký) phải bị
   hủy ngay khi không cần.
4. **§3.6.4 No floating-point arithmetic** trong mọi phép tính ML-DSA.

### 2.6 Hedged vs deterministic (§3.4, tr. 11)

- **Mặc định là "hedged"**: `rnd ← 32 byte random` (Alg. 2 dòng 5).
- Deterministic: `rnd ← {0}^32` — chỉ dùng khi không có nguồn randomness tươi;
  *"this variant should not be used on platforms where side-channel attacks are a concern"*.
- **Hai variant cho ra chữ ký khác nhau nhưng cùng một thuật toán verify** — verify giống hệt nhau
  (*"The same verification algorithm will work to verify signatures produced by either variant"*).
- *"Only implementing the hedged variant … is sufficient to guarantee interoperability."*

### 2.7 Quy trình Sign_internal (Algorithm 7, tr. 24) — tóm tắt đúng pseudocode

```
1:  (ρ, K, tr, s1, s2, t0) ← skDecode(sk)
2-4: ŝ1 ← NTT(s1); ŝ2 ← NTT(s2); t̂0 ← NTT(t0)
5:  Â ← ExpandA(ρ)
6:  μ ← H(BytesToBits(tr) ‖ M', 64)          # H = SHAKE256, 64 byte
7:  ρ″ ← H(K ‖ rnd ‖ μ, 64)
8:  κ ← 0
10: loop (rejection sampling):
11:   y ← ExpandMask(ρ″, κ)
12:   w ← NTT⁻¹(Â ∘ NTT(y))
13:   w1 ← HighBits(w)
15:   c̃ ← H(μ ‖ w1Encode(w1), λ/4)
16:   c ← SampleInBall(c̃)
18-19: compute ⟨⟨cs1⟩⟩, ⟨⟨cs2⟩⟩
20:   z ← y + ⟨⟨cs1⟩⟩
21:   r0 ← LowBits(w − ⟨⟨cs2⟩⟩)
23:   if ‖z‖∞ ≥ γ1 − β  or  ‖r0‖∞ ≥ γ2 − β  → reject (restart)
25-26: ⟨⟨ct0⟩⟩; h ← MakeHint(−⟨⟨ct0⟩⟩, w − ⟨⟨cs2⟩⟩ + ⟨⟨ct0⟩⟩)
28:   if ‖⟨⟨ct0⟩⟩‖∞ ≥ γ2  or  popcount(h) > ω → reject
31:   κ ← κ + ℓ
33: σ ← sigEncode(c̃, z mod±q, h)
```

### 2.8 Quy trình Verify_internal (Algorithm 8, tr. 27) — đúng pseudocode

```
1: (ρ, t1) ← pkDecode(pk)
2: (c̃, z, h) ← sigDecode(σ)
3: if h = ⊥ → false                     # hint encode sai
5: Â ← ExpandA(ρ)
6: tr ← H(pk, 64)
7: μ ← H(BytesToBits(tr) ‖ M', 64)
8: c ← SampleInBall(c̃)
9: w' ← NTT⁻¹(Â ∘ NTT(z) − NTT(c) ∘ NTT(t1 · 2^d))
10: w1' ← UseHint(h, w')
11: c̃' ← H(μ ‖ w1Encode(w1'), λ/4)
12: return (‖z‖∞ < γ1 − β)  and  (c̃ = c̃')
```
*(c̃' ký hiệu `c′̃` trong bản gốc — Alg. 8 dòng 12, tr. 27)*

### 2.9 KeyGen_internal (Algorithm 6, tr. 23)

```
1: (ρ, ρ', K) ← H(ξ ‖ IntegerToBytes(k,1) ‖ IntegerToBytes(ℓ,1), 128)   # domain sep theo (k,ℓ)
3: Â ← ExpandA(ρ)
4: (s1, s2) ← ExpandS(ρ')
5: t ← NTT⁻¹(Â ∘ NTT(s1)) + s2
6: (t1, t0) ← Power2Round(t)
8: pk ← pkEncode(ρ, t1)
9: tr ← H(pk, 64)
10: sk ← skEncode(ρ, K, tr, s1, s2, t0)
```

### 2.10 Hàm băm (§3.7, tr. 13)

- `H(str, ℓ) = SHAKE256(str, 8ℓ)` ; `G(str, ℓ) = SHAKE128(str, 8ℓ)` (FIPS 202).
- Demo thuần (pure ML-DSA) chỉ dùng SHAKE128/SHAKE256 — **không cần SHA-256** (chỉ phục vụ pre-hash OID).

### 2.11 Giới hạn vòng lặp (Appendix C, Table 3, tr. 52)

| Algorithm | Min loop limit | XOF output limit (bytes) |
|---|---|---|
| ML-DSA.Sign_internal | 814 | N/A |
| RejBoundedPoly | 481 | 481 |
| RejNTTPoly | 298 | 894 |
| SampleInBall | 121 | 221 |

*(Demo dùng thư viện — giới hạn này nằm trong thư viện, không do demo code quản lý. Ghi lại để biết.)*

### 2.12 Khác biệt với Dilithium (App. D, tr. 54)

ML-DSA derive từ CRYSTALS-DILITHIUM v3.1. Các điểm chốt (App. D.1/D.2/D.3):
ρ' và μ tăng 384 → 512 bit; Alg. 21 (hint unpack) khôi phục malformed-check; **toàn bộ bit của c̃ được dùng** trong SampleInBall; ExpandMask lấy bit từ **đầu** output của H; domain separation được thêm cho pure vs pre-hash và cho ξ theo (k,ℓ).
→ **Không dùng test vector của Dilithium round-3 cho ML-DSA** (khác biệt kỹ thuật, sẽ fail).

---

## 3. Bằng chứng empirical trên máy này (2026-10-02)

Môi trường: Windows, Python 3.13.12 (`py`), venv tại
`C:\Users\ngoan\AppData\Local\Temp\opencode\pqtest-venv`.
Script: `C:\Users\ngoan\AppData\Local\Temp\opencode\verify_mldsa.py`.

### 3.1 Thư viện được evaluate (theo fact, không theo quảng cáo)

| Thư viện | Phiên bản | Nguồn | Wheel win_amd64 py3.13 | Ghi chú |
|---|---|---|---|---|
| `pqcrypto` | 1.0.0 | PyPI (PyPI JSON API) | Có (`cp39-abi3-win_amd64.whl`) | Rust binding; summary: "ML-KEM, ML-DSA, SLH-DSA, …" |
| `quantcrypt` | 1.0.1 | PyPI | Có (`cp313-win_amd64.whl`) | "precompiled PQClean binaries" |
| `cryptography` | 50.0.2 | PyPI | — | **Không có ML-DSA** — chỉ dùng cho Ed25519/RSA |
| `liboqs-python` | 0.16.0.1 | PyPI | wheel `py3-none-any` nhưng **cần native liboqs DLL riêng** | Không cài trong lần test này |

*(Lưu ý PyPI: package tên `oqs` KHÔNG phải Open Quantum Safe — đó là thư viện "Open Quick Script" parse JS, loại. `liboqs` không tồn tại trên PyPI.)*

### 3.2 Kết quả test — **39/39 PASS**

Thực hiện trên cả 3 param set (44/65/87), cả 2 thư viện:

| # | Kiểm tra | Kết quả |
|---|---|---|
| 1 | Kích thước pk/sk/sig của pqcrypto == Table 2 | PASS ×3 |
| 2 | Kích thước pk/sk/sig thực tế (bytes do thư viện sinh) của quantcrypt == Table 2 | PASS ×3 (pk 1312/1952/2592, sk 2560/4032/4896, sig 2420/3309/4627) |
| 3 | Roundtrip sign→verify trong từng thư viện | PASS ×6 |
| 4 | Message bị sửa 1 byte → verify FAIL | PASS ×6 |
| 5 | Signature bị sửa 1 byte → verify FAIL | PASS ×6 |
| 6 | Verify bằng pk của keypair khác → FAIL | PASS ×6 |
| 7 | **Interop:** pqcrypto verify chữ ký do quantcrypt sinh | PASS ×3 |
| 8 | **Interop:** quantcrypt verify chữ ký do pqcrypto sinh | PASS ×3 |

Interop hai chiều qua 3 param set là bằng chứng mạnh nhất: hai cài đặt độc lập sinh/ký xác minh
chéo được ⇒ cùng encoding theo FIPS 204 (không phải "đúng nhưng lệch chuẩn").

### 3.3 Hợp đồng API — quan sát thực nghiệm (KHÔNG suy đoán)

| Hành vi | pqcrypto 1.0.0 | quantcrypt 1.0.1 |
|---|---|---|
| `keygen()` trả về | `(public_key, secret_key)` — xác nhận bằng cách đo độ dài (1312 vs 2560) và thử sign | `(public_key, secret_key)` — xác nhận bằng docstring source (`BaseDSS.keygen`) + đo độ dài |
| `sign(sk, msg)` | OK; nhận thêm `context=None, hash_algorithm=None` | OK; `sign(secret_key, message)` |
| `verify(...)` hợp lệ | trả `None` (truthy-check **không hoạt động** — phải try/except) | trả `True` (`raises=False`) |
| `verify(...)` không hợp lệ | raise `pqcrypto.InvalidSignatureError` (export ở **top-level** `pqcrypto`, không phải `pqcrypto.sign`) | trả `False` |
| Đo kích thước | hằng `SECRET_KEY_SIZE / PUBLIC_KEY_SIZE / SIGNATURE_SIZE` | qua `len(bytes)` |
| File signing | không có | có `sign_file` / `verify_file` |

> **Bài học đã xảy ra trong lúc test (ghi lại để không lặp lại):**
> 1. Gọi `verify(...) is True` trên pqcrypto → luôn FAIL dù chữ ký đúng (trả `None`).
> 2. Import `InvalidSignatureError` từ `pqcrypto.sign` → ImportError; đúng là `from pqcrypto import InvalidSignatureError`.
> 3. Giả định `keygen() -> (sk, pk)` → sai; cả 2 thư viện đều `(pk, sk)`.

### 3.4 Ký file — cách demo sẽ làm (theo evidence, không bịa)

FIPS 204 ký trên **message M là byte string bất kỳ** — file được ký nguyên văn (chunking không
được phép vì ML-DSA không có API streaming trong chuẩn). quantcrypt có `sign_file/verify_file`
nhưng về bản chất vẫn đọc toàn bộ file vào message. Demo sẽ: đọc file → `sign(bytes)` →
lưu signature (base64/hex) → `verify(bytes)`.

### 3.5 Edge-case tests — YÊU CẦU 4 (script `edge_tests.py`, 2026-10-02) — **0 FAIL**

| nhóm | kiểm tra | kết quả |
|---|---|---|
| biên message | rỗng · 1 byte · UTF-8 tiếng Việt · 1 MiB | PASS roundtrip (pqcrypto) |
| §3.6.2 pk/sig length | sig cắt 1 / thêm 1 / nửa / rỗng → reject | PASS ×4 (pqcrypto) |
| §3.6.2 pk/sig length | pk cắt 1 / thêm 1 / rỗng → reject | PASS ×3 (pqcrypto) |
| garbage | pk/sig ngẫu nhiên đúng độ dài → reject, không crash | PASS ×2 |
| context | sign+verify cùng ctx PASS; ctx khác / ctx rỗng khi verify → reject | PASS ×3 |
| context | ctx 256 byte → bị từ chối tại sign (đúng Alg.2) | PASS |
| sai khoá | sign bằng sk thiếu 1 byte → ValueError | PASS |
| quantcrypt | sig/pk sai độ dài → reject | PASS ×4 |
| quantcrypt | msg 1 MiB roundtrip | PASS |

**2 deviation có bằng chứng (không phải lỗi demo — ghi nhận trung thực):**

1. **pqcrypto giới hạn ctx ≤ 253 byte** (binary search: 253 accepted, 254 → `ValueError:
   invalid context length`), trong khi FIPS 204 Alg.2 cho phép ≤ 255. pqcrypto **chặt hơn chuẩn**
   → không tạo chữ ký sai, chỉ từ chối input mà chuẩn cho phép. Demo dùng ctx rỗng mặc định → không ảnh hưởng.
2. **quantcrypt từ chối message rỗng** (pydantic `min 1 byte`), trong khi FIPS 204 cho phép
   `M ∈ {0,1}*` (kể cả rỗng). pqcrypto chấp nhận message rỗng (đã PASS) → demo dùng pqcrypto → không ảnh hưởng.

**Hai deviation này → mục "Known deviations" trong REPORT.md.**

---

## 4. Quyết định implement (rút từ evidence ở trên)

| Quyết định | Chọn | Lý do dựa trên evidence |
|---|---|---|
| Thuật toán ML-DSA | **Dùng thư viện có chứng, KHÔNG tự viết lại** | Tự viết NTT/SampleInBall/rejection-loop theo pseudocode 65 trang → rủi ro sai không phát hiện được; §3.6.4 cấm float; hai thư viện độc lập đã pass interop (§3.2) |
| Thư viện chính (backend) | `pqcrypto 1.0.0` | Cài 1 lệnh (abi3 wheel win_amd64), API có hằng kích thước khớp Table 2, exception-based rõ ràng; đã pass toàn bộ test |
| Thư viện cross-check (test) | `quantcrypt 1.0.1` | Test interop 2 chiều = kiểm chứng độc lập, phát hiện sai chuẩn ngay |
| So sánh truyền thống | `cryptography 50.0.2` (Ed25519, RSA) | Thư viện chuẩn công nghiệp; ML-DSA không có ở đây (đã xác nhận) |
| Bản ký | **pure ML-DSA**, `ctx` mặc định rỗng | §5.4: pure preferred; chuẩn hóa được |
| Variant | hedged (mặc định thư viện) | §3.4: mặc định chuẩn; deterministic không tăng interop |
| Length check | verify sai độ dài pk/sig → trả false | §3.6.2 **bắt buộc** (thư viện đã làm; wrapper của demo không được bỏ qua) |
| Hiển thị kích thước | lấy Table 2 làm metadata UI, KHÔNG hardcode làm kết quả đo | Số đo runtime phải là `len()` thật; Table 2 chỉ để đối chiếu (vd "khớp chuẩn ✓") |
| Timing benchmark | đo tại runtime (`perf_counter`), ghi rõ "đo trên máy này" | Product principle: không bịa số |
| Test vector Dilithium round-3 | **không dùng** | App. D: ML-DSA khác Dilithium v3 → vector sẽ fail sai |

### 4.1 Điều CHƯA có evidence (phải kiểm chứng trước khi implement, không được giả định)

- [ ] Test vector chính thức cho ML-DSA (ACVP/CAVP): trang CAVP Digital Signatures chỉ liệt kê
      vector cho DSA/ECDSA/RSA (`186-*testvectors.zip`), **chưa tìm thấy zip ML-DSA** — cần tra
      thêm trong ACVP (github usnistgov/ACVP) trước khi khẳng định.
- [ ] Timing keygen/sign/verify thực tế cho 3 param set (chưa đo).
- [ ] FastAPI + python-multipart cho upload file (chưa cài, chưa test).
- [ ] Node/Next.js version tương thích (chưa khảo sát — sẽ ghi vào evidence trước khi chọn).

---

## 5. Checklist trước khi sang bước implement

- [x] Đọc toàn bộ FIPS 204 (65 trang, text trích xuất có số trang).
- [x] Ghi đúng Table 1 (tham số) và Table 2 (kích thước) theo trang gốc.
- [x] Đọc errata 7/31/2026 — không có thay đổi kỹ thuật.
- [x] Hash ghim 2 file nguồn.
- [x] Verify empirical kích thước == Table 2 (2 thư viện × 3 param set).
- [x] Verify roundtrip + negative tests + interop 2 chiều (39/39 PASS).
- [x] Ghi lại hợp đồng API thực nghiệm của từng thư viện.
- [ ] (mục 4.1 — các bước chưa có evidence)
