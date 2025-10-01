// The main script for the Context To Macro extension.

import { extension_settings, renderExtensionTemplateAsync, getContext } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";
import { executeSlashCommands } from "../../../slash-commands.js";

const extensionName = "st_context_to_macro";

const defaultSettings = {
    isEnabled: true,
    creationMode: 'macro', // 'macro' or 'variable'
    mappings: [],
};

/**
 * Safely retrieves a nested value from an object using a string path.
 * @param {object} obj The object to traverse.
 * @param {string} path The string path to the desired value.
 * @returns {any|undefined} The found value or undefined if the path is invalid.
 */
function getValueFromPath(obj, path) {
    try {
        let processedPath = path;
        if (processedPath.includes('[last]')) {
            if (obj.chat && obj.chat.length > 0) {
                const lastIndex = obj.chat.length - 1;
                processedPath = processedPath.replace(/\[last\]/g, `[${lastIndex}]`);
            } else {
                return undefined;
            }
        }
        const normalizedPath = processedPath.replace(/\[(\d+)\]/g, '.$1');
        const keys = normalizedPath.split('.');
        let result = obj;
        for (const key of keys) {
            if (result === null || result === undefined) return undefined;
            result = result[key];
        }
        return result;
    } catch (error) {
        console.error(`[${extensionName}] Error getting value from path '${path}':`, error);
        return undefined;
    }
}

/**
 * Creates the HTML for a single mapping row.
 * @param {object} mapping - The mapping object { contextPath, macroName, description }.
 * @param {number} index - The index of the mapping in the array.
 * @returns {jQuery}
 */
function createMappingRow(mapping, index) {
    const row = $(
        `<div class="ctm-mapping-row" data-index="${index}">
            <input class="ctm_context_path_input text_pole" type="text" placeholder="Context Path (e.g., chat[last].mes)" value="${mapping.contextPath}" />
            <input class="ctm_macro_name_input text_pole" type="text" placeholder="Macro/Variable Name" value="${mapping.macroName}" />
            <input class="ctm_description_input text_pole" type="text" placeholder="Optional Description" value="${mapping.description || ''}" />
            <button class="ctm-remove-button menu_button fa-solid fa-minus"></button>
        </div>`
    );
    return row;
}

/**
 * Renders all mapping rows from the settings into the container.
 */
function renderAllMappingRows() {
    const settings = extension_settings[extensionName];
    const container = $("#ctm_mapping_rows_container");
    container.empty();

    if (settings.mappings && Array.isArray(settings.mappings)) {
        settings.mappings.forEach((mapping, index) => {
            const row = createMappingRow(mapping, index);
            container.append(row);
        });
    }
}

function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }

    const settings = extension_settings[extensionName];
    if (!settings.mappings) settings.mappings = []; // Ensure mappings array exists

    $("#ctm_enabled_toggle").prop("checked", settings.isEnabled);
    $(`input[name="creation_mode"][value="${settings.creationMode || 'macro'}"]`).prop('checked', true);
    renderAllMappingRows();
}

function onEnabledToggleInput(event) {
    const isEnabled = Boolean($(event.target).prop("checked"));
    extension_settings[extensionName].isEnabled = isEnabled;
    saveSettingsDebounced();

    const settings = extension_settings[extensionName];
    const context = getContext();

    if (isEnabled) {
        // When enabling, do an immediate refresh.
        refreshVariables(true);
    } else {
        // When disabling, clean up all created macros and variables.
        if (settings.mappings && Array.isArray(settings.mappings)) {
            const commands = [];
            settings.mappings.forEach(mapping => {
                if (mapping.macroName) {
                    context.unregisterMacro(mapping.macroName);
                    // Correct syntax for flushing a variable
                    commands.push(`/flushvar ${mapping.macroName}`);
                }
            });
            if(commands.length > 0) {
                executeSlashCommands(commands.join(' | '));
            }
            toastr.info("ContextToMacro has been disabled and all created macros/variables have been cleared.");
        }
    }
}

function onCreationModeChange(event) {
    const newMode = $(event.target).val();
    extension_settings[extensionName].creationMode = newMode;
    saveSettingsDebounced();

    // Clean up items from any previous mode to ensure a clean state
    const settings = extension_settings[extensionName];
    const context = getContext();
    if (settings.mappings && Array.isArray(settings.mappings)) {
        const commands = [];
        settings.mappings.forEach(mapping => {
            if (mapping.macroName) {
                // Clean up both possibilities regardless of the old mode
                context.unregisterMacro(mapping.macroName);
                commands.push(`/flushvar ${mapping.macroName}`);
            }
        });
        if(commands.length > 0) {
            executeSlashCommands(commands.join(' | '));
        }
    }

    // Use a timeout to allow the async /flushvar command to complete before refreshing.
    setTimeout(() => {
        refreshVariables(true);
        toastr.info(`Switched to ${newMode} mode and refreshed.`);
    }, 250);
}

function onMappingInput(event) {
    const inputElement = $(event.target);
    const row = inputElement.closest('.ctm-mapping-row');
    const index = parseInt(row.data('index'), 10);
    let value = inputElement.val();

    const settings = extension_settings[extensionName];
    if (!settings.mappings || !settings.mappings[index]) return;

    if (inputElement.hasClass('ctm_context_path_input')) {
        settings.mappings[index].contextPath = value;
    } else if (inputElement.hasClass('ctm_description_input')) {
        settings.mappings[index].description = value;
    } else if (inputElement.hasClass('ctm_macro_name_input')) {
        const sanitizedValue = value.replace(/\s+/g, '_');
        if (value !== sanitizedValue) {
            inputElement.val(sanitizedValue);
            value = sanitizedValue;
        }
        settings.mappings[index].macroName = value;
    }
    saveSettingsDebounced();
}

function onAddButtonClick() {
    const settings = extension_settings[extensionName];
    settings.mappings.push({ contextPath: '', macroName: '', description: '' });
    saveSettingsDebounced();
    renderAllMappingRows();
    toastr.info("New mapping row added.");
}

function onRemoveButtonClick(event) {
    const row = $(event.target).closest('.ctm-mapping-row');
    const index = parseInt(row.data('index'), 10);

    const settings = extension_settings[extensionName];
    if (settings.mappings && settings.mappings[index]) {
        settings.mappings.splice(index, 1);
        saveSettingsDebounced();
        renderAllMappingRows();
        toastr.info("Mapping row removed.");
    }
}

function refreshVariables(isAutomatic = false) {
    const settings = extension_settings[extensionName];
    if (!settings.isEnabled) {
        if (!isAutomatic) {
            toastr.warning("Extension is disabled.");
        }
        return;
    }

    const context = getContext();
    let successCount = 0;

    settings.mappings.forEach(mapping => {
        if (mapping.contextPath && mapping.macroName) {
            const value = getValueFromPath(context, mapping.contextPath);

            if (value !== undefined) {
                const finalValue = String(value);
                if (settings.creationMode === 'variable') {
                    context.variables.local.set(mapping.macroName, finalValue);
                } else {
                    const description = mapping.description || `Value from '${mapping.contextPath}' (via ContextToMacro)`;
                    context.registerMacro(mapping.macroName, finalValue, description);
                }
                successCount++;
            } else {
                console.warn(`[${extensionName}] Could not find value for path: ${mapping.contextPath}`);
            }
        }
    });

    if (successCount > 0) {
        if (!isAutomatic) {
            toastr.success(`Refreshed ${successCount} ${settings.creationMode}(s).`);
        }
    } else {
        if (!isAutomatic) {
            toastr.info("No valid mappings to refresh, or no values found.");
        }
    }
}

jQuery(async () => {
    const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
    const settingsHtml = await $.get(`${extensionFolderPath}/context-to-macro.html`);
    $("#extensions_settings").append(settingsHtml);

    // Event Listeners
    $("#ctm_enabled_toggle").on("input", onEnabledToggleInput);
    $('input[name="creation_mode"]').on('change', onCreationModeChange);
    $("#ctm_add_button").on("click", onAddButtonClick);
    $("#ctm_refresh_button").on("click", () => refreshVariables(false));

    const container = $("#ctm_mapping_rows_container");
    container.on("input", ".ctm_context_path_input", onMappingInput);
    container.on("input", ".ctm_macro_name_input", onMappingInput);
    container.on("input", ".ctm_description_input", onMappingInput);
    container.on("click", ".ctm-remove-button", onRemoveButtonClick);

    // Set up the automatic refresh listeners
    const context = getContext();
    const refreshCallback = () => setTimeout(() => refreshVariables(true), 0);
    context.eventSource.on(context.eventTypes.APP_READY, refreshCallback);
    context.eventSource.on(context.eventTypes.CHAT_CHANGED, refreshCallback);
    context.eventSource.on(context.eventTypes.MESSAGE_SWIPED, refreshCallback);
    context.eventSource.on(context.eventTypes.MESSAGE_EDITED, refreshCallback);
    context.eventSource.on(context.eventTypes.MESSAGE_DELETED, refreshCallback);
    context.eventSource.on(context.eventTypes.CHARACTER_MESSAGE_RENDERED, refreshCallback);

    loadSettings();
});