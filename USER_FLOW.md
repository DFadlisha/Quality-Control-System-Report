# QCSR Mobile - User Flow & Test Guide
 
 ## 1. Login / Pre-Check
 *   **Action**: Ensure internet connection is active.
 *   **Check**: App should open to the **Dashboard** or **Scan Page**.
 *   **Note**: Ensure `google-services.json` is correctly placed for Firebase connectivity.

## 2. Scanning & Data Entry (The "Worker" Flow)
1.  **Navigate**: Click "Scan" in the bottom navigation.
2.  **Part Lookup**:
    *   **Input**: Enter a valid Part No (e.g., `PART-001`).
    *   **Verify**: System should auto-fill "Part Name" (e.g., "Generic Widget").
    *   *Alternative*: Manually type info if part not found.
3.  **Enter Data**:
    *   **Operator Name**: Enter "John Doe" (or your name).
    *   **Factory**: Enter "Factory A".
    *   **Quantities**:
        *   Sorted: `100`
        *   NG (Reject): `5`
    *   **NG Type**: Select "Scratch" or "Dent".
4.  **Submit**:
    *   Click "Submit Log".
    *   **Verify**: Success toast appears ("Log saved successfully").

## 3. Dashboard Monitoring (The "Manager" Flow)
1.  **Navigate**: Click "Dashboard" in the bottom navigation.
2.  **Check Stats**:
    *   **Verify**: "Total Sorted" and "Total NG" should have increased by the amounts you just entered (100 and 5).
    *   **Verify**: "Parts Processed" should reflect the count.
3.  **Review Logs**:
    *   Scroll down to "Recent Scans".
    *   **Verify**: Your new entry (Part-001, 100 qty) should be at the top of the list.

## 4. Reporting
1.  **Action**: Click the **Download Report** button (top right, download icon).
2.  **Verify**:
    *   A PDF named `inspection_report.pdf` is downloaded.
    *   Open it. It should be a **single page**.
    *   It should list your new "John Doe" entry in the tables.
    *   Header title: "Quality Sorting Inspection Report".

## 5. Offline Sync (Optional Advanced Test)
1.  **Action**: Turn off WiFi/Internet (simulate dead zone).
2.  **Scan**: Submit a log. App should say "Saved Offline".
3.  **Action**: Turn WiFi back on.
4.  **Verify**: App should auto-sync and data should appear in Dashboard after a few moments.
