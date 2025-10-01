# Context To Macro — SillyTavern Extension

# Human Overview

This is an extension that will take data from the GetContext object and save it to either a variable or a macro. That's basically it. It tries to clean up after itself when you disable it. You might be able to accomplish this with some slash commands, but this seemed cleaner.
I made it so I could data from the "Reasoning Summary" that generates when using Gemini, and feed it back into a prompt for meta analysis. Not sure if there are any other use cases people would use it for, but it's here if someone does. One thing to note, when using it in the 'variable' mode, it will 

## Overview

**Context To Macro** is a SillyTavern extension that lets you extract values from the SillyTavern context object and save them as macros or variables. This enables dynamic referencing and automation in chats, character scripts, and other extension workflows. Users can map any context path to a named macro or variable, with optional descriptions for clarity.

## Features

- **Flexible Mapping:** Define multiple mappings from context paths to macro/variable names.
- **Creation Modes:** Save as either a macro (for slash commands/scripts) or a variable (for local context storage).
- **Automatic Refresh:** Values update automatically on key context events (chat changes, message edits, character message rendering).
- **Manual Controls:** Enable/disable the extension, switch creation modes, add/remove mappings, and manually refresh values.
- **Safe Value Extraction:** Robust path parsing supports nested context objects and special syntax (e.g., `[last]` for last chat message).
- **Cleanup:** Disabling or switching modes flushes all created macros/variables for a clean state.
- **UI Integration:** Settings panel for managing mappings and extension state.

## Installation

1. Place the extension files in your SillyTavern third-party extensions directory.
2. Ensure the following files are present:
    - `index.js` (main logic)
    - `context-to-macro.html` (settings UI)
    - `style.css` (styling)
    - `manifest.json` (metadata)
3. Use SillyTavern’s extension installer or manually enable via the settings panel.

## Usage

1. **Enable the Extension:** Toggle the extension on in the settings panel.
2. **Choose Creation Mode:** Select either `macro` or `variable` mode.
3. **Add Mappings:** For each mapping, specify:
    - **Context Path:** The path to the value in the context object (e.g., `chat[0].name`).
    - **Macro/Variable Name:** The name to assign.
    - **Description:** (Optional) A note for clarity.
4. **Refresh Values:** Values refresh automatically on context events, or manually via the refresh button.
5. **Switch Modes:** Changing between macro and variable modes flushes previous values and re-creates them in the new mode.

### Example

Suppose you want to save the name of the last chat message as a macro called `lastUserName`:
- Context Path: `chat[last].name`
- Macro Name: `lastUserName`
- Description: `Stores the name of the last user who sent a message`

## Prerequisites

- SillyTavern version compatible with third-party extensions and macro/variable APIs.
- No additional dependencies required.

## License

Use it however you want. 

---

### Technical Highlights

- **Main Logic:** Uses `getValueFromPath` to safely traverse context objects, supporting dynamic and nested paths.
- **Event Handling:** Listeners for SillyTavern context events keep macros/variables in sync.
- **UI:** HTML and CSS files provide a simple interface for managing mappings and extension state.
- **Manifest:** Metadata ensures proper loading order and compatibility.
