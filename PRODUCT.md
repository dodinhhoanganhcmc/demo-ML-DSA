# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- Frontend: Next.js (App Router).
- Backend: Python + FastAPI (user chọn; đề xuất của user là "Python hoặc cái gì phù hợp nhất", đã xác nhận Python).
- ML-DSA implementation: open — ứng viên: liboqs Python bindings (oqs-python) hoặc pqcrypto; phải hỗ trợ ML-DSA-44/65/87 (FIPS 204) + Ed25519/RSA cho phần so sánh. Sẽ chốt khi khảo sát thư viện.
- Repo chưa có git remote, chưa có scaffold.

## Users

Người xem chính là giảng viên và bạn học trong bối cảnh bài tập môn học / thuyết trình đồ án. Người dùng thao tác trực tiếp trên demo để tự trải nghiệm chữ ký post-quantum.

## Product Purpose

Website demo chữ ký số ML-DSA (FIPS 204) và chữ ký post-quantum, nhẹ và dễ chạy. Demo thành công khi người xem (giảng viên/bạn học) tự thao tác được keygen → ký → xác minh và thấy được số liệu thật (kích thước khoá/chữ ký, thời gian ký) — hiểu được chữ ký post-quantum hoạt động như thế nào.

## Positioning

Chạy ML-DSA thật theo FIPS 204 (không mô phỏng giả), số liệu đo trực tiếp khi chạy — không dùng con số bịa. Một demo giảng dạy tương tác, nhẹ, có so sánh đối chiếu với chữ ký truyền thống.

## Operating Context

- Chạy local khi demo (dev server Next.js + FastAPI), trình bày trước lớp.
- Dữ liệu không cần lưu trữ: thao tác trên bộ nhớ, không database, không tài khoản.
- Tham chiếu chuẩn: FIPS 204 (Module-Lattice-Based Digital Signature Standard), https://csrc.nist.gov/pubs/fips/204/final

## Capabilities and Constraints

Phạm vi đã xác nhận:
- Keygen → Sign → Verify trên text: nhập text, sinh khoá, ký, xác minh, hiển thị khoá/chữ ký dạng hex.
- Ký file tải lên: upload file, ký và xác minh trên file thật.
- So sánh ML-DSA-44 / 65 / 87: kích thước khoá/chữ ký + thời gian ký/xác minh mỗi cấp.
- So sánh với Ed25519/RSA: chạy song song để đối chiếu kích thước & tốc độ.

Ràng buộc:
- Nhẹ ("demo nhẹ"): không authentication, không database, không rate-limit phức tạp.
- Backend Python + FastAPI, frontend Next.js.
- Open decision: ngôn ngữ hiển thị của UI (Việt hay Anh) — chưa chốt.
- Open decision: thư viện ML-DSA Python cụ thể (xem ## Stack).

## Evidence on Hand

- FIPS 204 final: https://csrc.nist.gov/pubs/fips/204/final (user cung cấp).
- Không có logo, hình ảnh, benchmark, testimonial nào khác. Không được bịa số liệu: mọi benchmark hiển thị phải đo tại runtime.

## Product Principles

1. Crypto thật, không mô phỏng — mọi thao tác gọi thư viện ML-DSA thật.
2. Số liệu trung thực — hiển thị kết quả đo tại chỗ, không viết trước số cố định.
3. Giáo dục trước, đồ họa sau — mỗi bước thao tác phải giải thích được điều nó chứng minh.
4. Nhẹ và chạy được ngay — một lệnh khởi động, không cần hạ tầng ngoài.
