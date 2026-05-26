# Privacy Policy – Forex Market Hours

**Last updated: 2026-05-26**

Forex Market Hours is a Chrome extension that displays the live open/closed
status of global Forex sessions in your browser. This document explains, in
plain language, what data the extension touches and what it does **not** do.

## TL;DR

- No analytics, no telemetry, no advertising IDs.
- No user accounts, no sign-up, no cloud storage controlled by us.
- The only outbound request the extension ever makes is to
  `https://api.tradinghours.com`, and **only** if you explicitly enter a
  tradinghours.com API key and enable the integration.
- All preferences are stored locally in Chrome's built-in
  [`chrome.storage.sync`](https://developer.chrome.com/docs/extensions/reference/api/storage)
  area on your own Google account.

## Data we collect

We do not collect, transmit, or share any personal information.

The extension stores the following preferences locally so it remembers your
configuration between sessions:

| Key                    | Stored where             | Contents |
| ---------------------- | ------------------------ | ---------------------------------------------------------- |
| `selectedMarketIds`    | `chrome.storage.sync`    | IDs of markets you've enabled. |
| `customMarkets`        | `chrome.storage.sync`    | Custom markets you've added (name, timezone, hours). |
| `notificationsEnabled` | `chrome.storage.sync`    | Whether desktop notifications are on. |
| `useTradingHoursApi`   | `chrome.storage.sync`    | Whether the optional API integration is on. |
| `tradingHoursApiKey`   | `chrome.storage.sync`    | The API key you paste, if any. |
| `lastMarketStates`     | `chrome.storage.local`   | A small open/closed snapshot used to detect transitions for notifications. |

`chrome.storage.sync` is Chrome's built-in synced storage. If you're signed
into Chrome, these values may sync across your own devices through your Google
account. Nothing is sent to any server we control.

## Network requests

The extension only makes outbound HTTPS requests when **both** of the
following are true:

1. You have entered a `tradinghours.com` API key in the Settings page.
2. You have toggled **Use TradingHours.com API when available** to on.

In that case, the extension may call:

- `https://api.tradinghours.com/v3/markets?group=allowed`
- `https://api.tradinghours.com/v3/markets/status?fin_id=...`
- `https://api.tradinghours.com/v3/markets/details?fin_id=...`

These requests carry only:

- Your API key (in the `Authorization` header).
- The FinIDs of the markets you've selected (in the query string).

Responses are cached locally for 5 minutes to minimize traffic. We do not
intercept, log, or proxy these requests; they go directly from your browser to
`tradinghours.com`. See the [TradingHours privacy policy](https://www.tradinghours.com/privacy)
for their handling of API requests.

## Permissions explained

| Permission             | Why it's needed |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| `storage`              | Save your selected markets and preferences. |
| `alarms`               | Wake the background worker every 30 seconds to update the toolbar badge and check for open/close transitions. |
| `notifications`        | Show a desktop notification when a market opens/closes (only if you turn this on). |
| Host: `tradinghours.com` | Talk to the optional TradingHours.com API when you enable it. Never used otherwise. |

The extension does **not** request access to the contents of any web page, your
browsing history, your tabs (other than opening the welcome screen once on
install), bookmarks, or any other browser data.

## Third parties

The extension does not embed analytics SDKs, advertising libraries, social
trackers, or any third-party code. The only third-party service it can talk to
is `tradinghours.com`, and only when you opt in by providing an API key.

## Children

The extension is a passive informational tool and is suitable for all ages.

## Changes to this policy

If material changes are made, they will be reflected in this file and the
**Last updated** date at the top.

## Contact

For privacy questions, open an issue on the extension's source repository.
