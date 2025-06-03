@TGYTWatch_Bot
=======

TGYT-WatchBot is a Telegram bot that allows you to monitor YouTube channels and get instant video updates directly in your Telegram groups or chats.
Just write to [@TGYT-WatchBot](https://t.me/TGYTWatch_Bot), add your favorite channels, and get notified when new videos are published!

## How to Get Your Telegram Group or Channel ID

To use **TGYT-WatchBot**’s group features, you’ll need your group or channel’s numeric ID. The easiest way is with [@getmyid_bot](https://t.me/getmyid_bot):

1. **Add @getmyid_bot to your group or channel.**
2. **Send any message** in your group/channel, or mention the bot.
3. The bot will reply with:
   - Your **User ID**
   - The **Current Chat ID** (this is the group or channel ID)

> **Note:**  
> - Group and Channel IDs are usually negative numbers, e.g. `-1001234567890`.
> - Only admins can add bots to private groups/channels.

**Example Output:**
- Your user ID: 62155370
- Current chat ID: -4901111704

---

## Add a Custom Group to TGYT-WatchBot

Once you have your group ID, use the following command to add a group to the bot:
- /addgroup [GROUPNAME] [-CHATID]

Where:
- `ENG` is your custom group name (you can choose any name you like)
- `-4901111704` is your group/chat or channel’s numeric ID

That’s it! Your group is now linked to **TGYT-WatchBot**.


🚧 COMING UP
---
- Assign videos to specific groups based on language or tags (e.g., English videos to ENG group, Russian videos to RUS group)
- Group management UI improvements (edit group, advanced removal, etc.)
- Channel-to-group mapping for more granular control
- Improved error handling and feedback for users
- Admin dashboard for managing channels and groups
- Automatic detection and assignment of video language
- Notification customization per group
- Support for additional video platforms (future)


Run
---
Use node-ytSub_example as the service for init.d or enter in console:

    node dist/main.js

Let me know if you want even more flair or details!
