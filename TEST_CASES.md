# MultiEats — Standard, Edge and Manual Test Cases

This project uses **PostgreSQL**, so database references in the supplied generic test list to "MySQL" are executed against PostgreSQL instead. The test IDs and intent are preserved.

## 20. Standard / Compulsory Test Cases

| Test ID | Module | Test Scenario | Expected Result | Implementation / Verification | Status |
|---|---|---|---|---|---|
| ST-01 | Application | Application launches | Application opens | Frontend pages are served by Express; `/health` verifies server + DB | PASS |
| ST-02 | Login | Valid login | Login successful | `/auth/login` validates password and returns signed token | PASS |
| ST-03 | Login | Invalid password | Login rejected | Invalid credentials return HTTP 401 | PASS |
| ST-04 | Input | Empty mandatory field | Validation error | Signup/order/menu inputs validate required values; DB constraints enforce required fields | PASS |
| ST-05 | CREATE | Add valid record | Record inserted | Customer/order creation and owner menu-item creation use PostgreSQL stored procedures | PASS |
| ST-06 | READ | View records | Correct records displayed | Restaurant, menu, order, admin and owner reads are implemented | PASS |
| ST-07 | Search | Search existing record | Correct record displayed | Restaurant search filters name/cuisine/area; menu search is available through restaurant views | PASS |
| ST-08 | UPDATE | Update record | Record updated | Restaurant/menu/order-status update routes call database procedures | PASS |
| ST-09 | DELETE | Delete record | Record deleted | Owner menu DELETE route calls `sp_admin_delete_menu_item` | PASS |
| ST-10 | PK | Duplicate primary key | Rejected | PostgreSQL PRIMARY KEY constraints reject duplicates | PASS |
| ST-11 | NOT NULL | NULL mandatory field | Rejected | PostgreSQL NOT NULL constraints and procedure validation reject missing required data | PASS |
| ST-12 | UNIQUE | Duplicate unique value | Rejected | User email and order/payment/delivery uniqueness are enforced by PostgreSQL | PASS |
| ST-13 | FK | Invalid foreign key | Rejected | PostgreSQL foreign keys protect Users, Restaurants, Orders, MenuItems and related records | PASS |
| ST-14 | JOIN | Execute JOIN | Correct result | Admin/customer/restaurant activity queries use JOINs across related tables | PASS |
| ST-15 | Aggregate | Execute aggregate | Correct result | Dashboard/revenue/refund queries use COUNT/SUM/GROUP BY | PASS |
| ST-16 | View | Execute view | Correct result | Application reads are exposed through stored procedures rather than SQL views | N/A |
| ST-17 | Integration | Frontend → Backend | Request processed | Frontend `api()` calls Express routes with JSON + auth token | PASS |
| ST-18 | Integration | Backend → MySQL | Correct operation | This project uses PostgreSQL, not MySQL; backend connects through `pg` | N/A — PostgreSQL |
| ST-19 | Database | MySQL → Backend | Correct response | PostgreSQL → Backend responses are returned as JSON from stored procedures | N/A — PostgreSQL |
| ST-20 | Error | Backend unavailable | Error handled | Frontend catches fetch failure and shows a backend-unavailable message | PASS |

## 21. Edge Test Cases

| Test ID | Edge Scenario | Test Data / Condition | Expected Result | Implementation / Verification | Status |
|---|---|---|---|---|---|
| ET-01 | Empty input | Blank | Validation error | Required-field checks and DB constraints | PASS |
| ET-02 | Minimum value | Valid minimum price/quantity | Accepted | Quantity > 0 and price >= 0 constraints | PASS |
| ET-03 | Below minimum | Quantity 0 / negative price | Rejected | CHECK constraints and procedure validation | PASS |
| ET-04 | Maximum value | Valid supported input length/value | Accepted | PostgreSQL VARCHAR/numeric constraints accept valid range | PASS |
| ET-05 | Maximum + 1 | Oversized/invalid value | Rejected/handled | DB types/constraints and HTTP validation handle invalid values | PASS |
| ET-06 | Duplicate record | Duplicate email / unique payment / delivery assignment | Rejected | UNIQUE constraints + conflict handling | PASS |
| ET-07 | Special character | `@#$%` | Safely handled | Parameterized PostgreSQL queries and HTML escaping | PASS |
| ET-08 | SQL injection | `' OR 1=1 --` | Rejected/safely handled | All DB calls are parameterized; no user input is concatenated into SQL | PASS |
| ET-09 | Very large input | Oversized text/value | Handled correctly | HTTP + PostgreSQL type/length validation | PASS |
| ET-10 | Non-existing record | Unknown ID | Proper message | Procedures return controlled 404 errors | PASS |
| ET-11 | MySQL unavailable | DB unavailable | Error handled | Project uses PostgreSQL; `/health` returns database down and frontend handles API failure | N/A — PostgreSQL |
| ET-12 | Backend unavailable | Stop Node server | Error handled | `api()` shows backend connection error | PASS |
| ET-13 | Invalid datatype | String where number required | Rejected | PostgreSQL/Express validation returns 400 | PASS |
| ET-14 | Network interruption | Fetch interrupted | Error handled | Frontend `api()` catches network failures | PASS |
| ET-15 | Transaction failure | Order creation fails part-way | Rollback | `sp_place_order` is a single PostgreSQL function/transaction; failure rolls back the order | PASS |

## 22. Manual Test Cases

### MT-01 — Login
**Objective:** Verify that a valid user can log in.

**Steps**
1. Open `login.html`.
2. Enter a registered email.
3. Enter the correct password.
4. Click Login.
5. Verify the correct dashboard opens.

**Expected:** Customer → customer pages; main admin → admin panel; restaurant owner → own restaurant dashboard.

**Database verification:**
```sql
SELECT user_id, name, email, role, restaurant_id
FROM Users
WHERE lower(email)=lower('your-test-email@example.com');
```

**Status:** PASS

### MT-02 — Add Record
**Steps**
1. Login as restaurant owner.
2. Open Menu.
3. Click Add item.
4. Enter valid item data.
5. Click Add item.
6. Verify success message.
7. Verify item appears on webpage.
8. Verify item in PostgreSQL.

**Database verification:**
```sql
SELECT * FROM MenuItems
WHERE restaurant_id = <restaurant_id>
ORDER BY item_id DESC;
```

**Status:** PASS

### MT-03 — Search/View Record
**Steps**
1. Login as customer.
2. Open Restaurants.
3. Enter a restaurant/dish/area search term.
4. Verify matching records.
5. Open the restaurant and compare its menu with PostgreSQL.

**Status:** PASS

### MT-04 — Update Record
**Steps**
1. Login as restaurant owner.
2. Open Menu or My Restaurant.
3. Edit a value.
4. Save.
5. Verify webpage.
6. Verify PostgreSQL.

**Database verification:**
```sql
SELECT * FROM Restaurants WHERE restaurant_id = <restaurant_id>;
SELECT * FROM MenuItems WHERE item_id = <item_id>;
```

**Status:** PASS

### MT-05 — Delete Record
**Steps**
1. Login as restaurant owner.
2. Open Menu.
3. Click Delete on a menu item.
4. Confirm deletion.
5. Verify it disappears from webpage.
6. Execute SELECT in PostgreSQL.
7. Verify the record is removed.

**Database verification:**
```sql
SELECT * FROM MenuItems WHERE item_id = <deleted_item_id>;
```

**Status:** PASS

## Additional MultiEats-specific regression tests

### MT-06 — Partial restaurant cancellation + refund
1. Create a multi-restaurant order.
2. Login as one restaurant owner.
3. Select **Reject** for that restaurant.
4. Verify its sub-order becomes `cancelled`.
5. Verify a Refund row is created for that sub-order amount.
6. Login as the customer.
7. Verify **"Refund of ₹X credited to your account."** is shown for that restaurant.
8. Verify the cancelled restaurant does not display the delivery partner name.
9. Verify other active restaurants can continue processing the same overall order.

### MT-07 — Delivered status
1. Login as restaurant owner.
2. Open Orders.
3. Select **Delivered**.
4. Verify the sub-order status becomes `delivered` in PostgreSQL.
5. Verify the customer sees the updated status.

### MT-08 — Single delivery partner
1. Create a multi-restaurant order.
2. Assign delivery from the first/main restaurant.
3. Verify exactly one `DeliveryAssignment` row exists for the overall order.
4. Try assigning from another restaurant.
5. Verify the request is rejected by the backend.

### MT-09 — Role isolation
1. Login as Blue Nile owner.
2. Verify only Blue Nile data is available.
3. Attempt to request another restaurant's order by ID.
4. Verify backend returns access denied/not found.
5. Repeat for another restaurant owner.

### MT-10 — UI cleanup
1. Open customer home page.
2. Verify the four technical step labels are absent:
   - Set location
   - Pick restaurants
   - Haversine check
   - One delivery
3. Verify restaurant photo cards do not show cuisine emojis over the photo.
4. Verify Haversine validation still works during cart/order validation.
