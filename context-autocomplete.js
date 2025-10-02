/**
 * Builds a simplified skeleton of an object, representing its structure.
 * @param {object} obj The object to analyze.
 * @param {string} [prefix=''] The prefix for the current path.
 * @returns {object} A map-like object representing the object's structure.
 */
export function buildObjectSkeleton(obj, prefix = '') {
    const skeleton = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const newPrefix = prefix ? `${prefix}.${key}` : key;
            const value = obj[key];

            if (Array.isArray(value)) {
                skeleton[newPrefix] = { type: 'array', children: {} };
                // To represent array elements, we can add a special key like [0] or [last]
                // For now, we'll just indicate it's an array.
            } else if (typeof value === 'object' && value !== null) {
                skeleton[newPrefix] = { type: 'object', children: buildObjectSkeleton(value, '') };
            } else {
                skeleton[newPrefix] = { type: typeof value };
            }
        }
    }
    return skeleton;
}

/**
 * Gets suggestions for a given path from the object skeleton.
 * @param {object} skeleton The object skeleton from buildObjectSkeleton.
 * @param {string} path The path to get suggestions for.
 * @returns {string[]} An array of suggestions.
 */
export function getSuggestionsForPath(skeleton, path) {
    if (!path) {
        return Object.keys(skeleton);
    }

    const parts = path.split('.');
    let current = skeleton;

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const currentPath = parts.slice(0, i + 1).join('.');

        if (current[currentPath] && current[currentPath].type === 'object') {
            current = current[currentPath].children;
        } else {
            return []; // Path does not exist or is not an object
        }
    }

    return Object.keys(current);
}

/**
 * The provider function for the AutoComplete class.
 * @param {string} text The text in the input field.
 * @param {number} index The cursor position.
 * @returns {Promise<AutoCompleteNameResult>} A promise that resolves to an AutoCompleteNameResult.
 */
export async function contextPathProvider(text, index) {
    const { getContext } = await import('../../../extensions.js');
    const { AutoCompleteNameResult } = await import('../../../../scripts/autocomplete/AutoCompleteNameResult.js');
    const { AutoCompleteOption } = await import('../../../../scripts/autocomplete/AutoCompleteOption.js');

    const context = getContext();
    const skeleton = buildObjectSkeleton(context);

    // This is a simplified implementation. We'll need to parse the text to get the current path.
    const suggestions = getSuggestionsForPath(skeleton, text);

    const optionList = suggestions.map(s => new AutoCompleteOption(s, s));

    return new AutoCompleteNameResult(text, 0, text.length, optionList);
}
