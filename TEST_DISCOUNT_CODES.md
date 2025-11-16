# Hướng dẫn Test Discount Codes trên App

## 📋 Các bước chuẩn bị

### 1. Seed Discount Codes vào Database

Trước tiên, cần chạy script để tạo discount codes trong database:

```bash
# Di chuyển vào thư mục Backend
cd Backend

# Chạy seed discount codes
node seed/seedDiscountCodes.js
```

Bạn sẽ thấy output:
```
🧹 Cleared old discount codes
✅ Seed discount codes done
```

**Các discount codes được tạo:**
- `WELCOME10` - 10% off (limited 100 uses)
- `SAVE20` - 20% off (unlimited)
- `PCEXCLUSIVE` - 15% off cho PC packages only
- `BLACKFRIDAY50` - 50% off (limited 200 uses)
- `STREAMING25` - 25% off cho Streaming packages only
- `FIRST5` - 5% off (unlimited)
- `EXPIRED` - 30% off (expired - để test error)

---

### 2. Khởi động Backend Server

```bash
# Nếu đang ở thư mục Backend, hoặc cd vào Backend
cd Backend

# Chạy server (development mode với nodemon)
npm run dev

# HOẶC chạy production mode
npm start
```

Backend sẽ chạy tại: `http://localhost:3000`

Đảm bảo thấy log:
```
✅ MongoDB connected successfully
🚀 Server is running on http://localhost:3000
```

---

### 3. Khởi động Frontend App

Mở terminal mới:

```bash
# Di chuyển vào thư mục Frontend
cd Frontend

# Khởi động Expo app
npm start

# HOẶC
npx expo start
```

Sau đó chọn một trong các options:
- `a` - Mở trên Android emulator
- `i` - Mở trên iOS simulator
- Quét QR code với Expo Go app trên điện thoại

---

## 🧪 Cách Test Discount Codes trên App

### Bước 1: Đăng nhập/Đăng ký
1. Mở app trên emulator/simulator/thiết bị
2. Đăng nhập hoặc đăng ký tài khoản

### Bước 2: Chọn Package và vào Checkout
1. Trên màn hình **Home**, chọn một package (ví dụ: "PC Gaming Elite")
2. Click nút **"View"** hoặc **"Subscribe"**
3. Màn hình **Package Detail** sẽ hiển thị
4. Click nút **"Subscribe"** để vào **Checkout**

### Bước 3: Test Apply Discount Code

#### Test 1: Apply code thành công
1. Trong phần **"Discount Code"**, nhập: `WELCOME10`
2. Click nút **"Apply"**
3. ✅ Bạn sẽ thấy:
   - Code được apply thành công (hiển thị checkmark màu xanh)
   - Giá được giảm thêm 10%
   - Hiển thị discount amount trong Order Summary

#### Test 2: Test các codes khác
- `SAVE20` - Giảm 20% (unlimited)
- `BLACKFRIDAY50` - Giảm 50%
- `FIRST5` - Giảm 5%

#### Test 3: Test code cho category cụ thể
- Chọn package **PC** → Nhập `PCEXCLUSIVE` → ✅ Apply được
- Chọn package **Streaming** → Nhập `STREAMING25` → ✅ Apply được
- Chọn package **PlayStation** → Nhập `PCEXCLUSIVE` → ❌ Error: "Discount code does not apply to this category"

#### Test 4: Test error cases
- Nhập code không tồn tại: `INVALID123` → ❌ Error: "Discount code not found"
- Nhập `EXPIRED` → ❌ Error: "Discount code has expired" hoặc "Discount code is inactive"

#### Test 5: Remove discount code
1. Sau khi apply code thành công
2. Click nút **"Remove"** hoặc icon **X**
3. ✅ Code được remove, giá trở về trước khi apply

### Bước 4: Complete Order với Discount Code
1. Apply discount code thành công
2. Click nút **"Complete Order"**
3. ✅ Order được tạo với giá đã giảm
4. ✅ Discount code usage count được tăng lên trong database

---

## 🔍 Kiểm tra Discount Code trong Database

Nếu muốn kiểm tra discount code đã được sử dụng:

```bash
# Kết nối MongoDB
mongosh

# Chọn database
use <your_database_name>

# Xem tất cả discount codes
db.discountcodes.find()

# Xem chi tiết một code cụ thể
db.discountcodes.findOne({ code: "WELCOME10" })

# Xem usedCount đã tăng sau khi apply
db.discountcodes.find({ code: "WELCOME10" }, { usedCount: 1 })
```

---

## 📝 Test Cases Checklist

- [ ] Seed discount codes thành công
- [ ] Backend server chạy bình thường
- [ ] Frontend app kết nối được với backend
- [ ] Apply code thành công với `WELCOME10`
- [ ] Giá được tính đúng (package discount + code discount)
- [ ] Remove code hoạt động
- [ ] Error handling khi code không tồn tại
- [ ] Error handling khi code expired
- [ ] Error handling khi code không apply cho category
- [ ] Complete order với discount code thành công
- [ ] Usage count tăng sau khi complete order

---

## 🐛 Troubleshooting

### Lỗi: "Discount code not found"
- ✅ Kiểm tra đã chạy `node seed/seedDiscountCodes.js` chưa
- ✅ Kiểm tra code đã nhập đúng (uppercase/lowercase không quan trọng)

### Lỗi: "Network request failed"
- ✅ Kiểm tra backend server đang chạy
- ✅ Kiểm tra `API_BASE_URL` trong `checkout.tsx` đúng với địa chỉ backend
- ✅ Với Android emulator: dùng `http://10.0.2.2:3000`
- ✅ Với iOS simulator: dùng `http://localhost:3000`
- ✅ Với thiết bị thật: dùng IP local network (ví dụ: `http://192.168.1.100:3000`)

### Lỗi: "MongoDB connection error"
- ✅ Kiểm tra MongoDB đang chạy
- ✅ Kiểm tra connection string trong `.env` file

---

## 💡 Tips

1. **Test với nhiều packages khác nhau** để đảm bảo discount code apply đúng
2. **Test với cả package có discount và không có discount** để xem tính toán giá
3. **Test complete order** để đảm bảo usedCount được tăng
4. **Test với codes hết hạn hoặc đã dùng hết limit** để kiểm tra validation

---

Chúc bạn test thành công! 🎉

