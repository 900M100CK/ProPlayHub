# Guide: Testing Discount Codes in the App
## ?? Preparation
### 1. Seed discount codes into the database
- From repo root: `cd Backend && node seed/seedDiscountCodes.js` to create default codes (`WELCOME10`, `SPRING15`, `BLACKFRIDAY50`). Update the seed script if you need different codes.

### 2. Start backend and frontend
- Backend: `cd Backend && npm start` (ensure `.env` is configured).
- Frontend: `cd Frontend && npm start`, then choose:
  - `a` - Android emulator
  - `i` - iOS simulator
  - Or scan the QR code with Expo Go on your device.

## ?? Test scenarios
### Step 1: Sign in / Sign up
1. Launch the app on emulator/simulator/device.
2. Sign in or create a new account.

### Step 2: Pick a package and open checkout
1. On **Home**, choose a package (e.g., "PC Gaming Elite").
2. Tap **View** or **Subscribe** to open **Package Detail**.
3. Tap **Subscribe** to enter **Checkout**.

### Test 1: Apply code successfully
1. Enter `WELCOME10`.
2. Tap **Apply**.
   - ? Code applies (green check appears).
   - ? Price is reduced by the discount percentage.

### Test 2: Invalid code
- Enter `INVALID123` ? ? Error: "Discount code not found".

### Test 3: Remove code
1. After applying a valid code, tap **Remove** or the **X** icon.
2. ? Code is removed; price returns to original.

### Test 4: Complete order with discount
1. Apply a valid code.
2. Tap **Complete Order**.
3. ? Order is created with discounted price.
4. ? Discount code `usedCount` increases in the database.

## ?? Verify in database
- Check `usedCount` after applying a code.
- Ensure seed data exists if tests fail.

## ? Checklist
- [ ] Seed discount codes successfully.
- [ ] Backend server running.
- [ ] Apply code works with `WELCOME10`.
- [ ] Price calculation correct (package discount + code discount).
- [ ] Handles invalid code gracefully.
- [ ] Handles category/package restrictions correctly.
- [ ] Complete order with discount works; usage count increments.
- [ ] `API_BASE_URL` in `checkout.tsx` points to the correct backend:
  - Android emulator: `http://10.0.2.2:3000`
  - iOS simulator: `http://localhost:3000`
  - Physical device: local network IP, e.g., `http://192.168.1.100:3000`

## ?? Additional coverage
- Test multiple packages (with and without discounts).
- Test expired codes or codes exceeding usage limit.

Happy testing! ??
