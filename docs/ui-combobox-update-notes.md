# Dynamic Dropdown Combobox Notes

## Summary
Dropdown questions now behave like accessible comboboxes. Users can type to filter long lists (e.g., states), navigate with arrow keys, and confirm with Enter. The control keeps the familiar dropdown layout while exposing the richer interactions requested by Paper Prisons staff.

## User Experience Changes
- Text input shows the selected label and supports free typing to search.
- Down/Up arrows open the list and move through filtered options.
- Enter selects the highlighted option, Esc collapses the list and restores the previous choice.
- Clicks outside the component close the menu and reset the input to the saved selection.

## Implementation Details
- Location: `src/components/FormDropDownQuestion.js`
  - Maintains `isOpen`, `searchTerm`, and `activeIndex` state to coordinate filtering and keyboard focus.
  - Filters options via `useMemo`, matching the label against the user's query.
  - Handles outside clicks to close the list and re-sync text (`useEffect` with `mousedown` listener).
  - Uses ARIA roles/attributes (`role="combobox"`, `aria-expanded`, `aria-autocomplete`, `role="option"`) for screen-reader compatibility.
- Styles in `src/styles/globals.css`
  - `.dynamic-form-dropdown-question` and `.dynamic-form-combobox` ensure the field spans the available width.
  - `.dynamic-form-select-field-option-highlight` and `.dynamic-form-select-field-option-active` add hover and selection states.
- Component still calls `onChange(id, option.value, option.option)` so upstream branching logic remains unchanged.

## Testing Checklist
1. Type within the input to confirm filtering works for several values.
2. Navigate only with the keyboard (Tab → Arrow keys → Enter) to ensure focus and selection behave correctly.
3. Click away mid-search to verify the previous selection is restored.
4. Test on mobile (touch interaction) to confirm tapping opens/closes and selects as expected.
5. Ensure results export to PDF still uses the chosen option (no change expected).

## Future Enhancements
- Consider supporting fuzzy matching or highlighting the matching substring.
- Add optional props for custom placeholders or disabled state if needed.
- Integrate analytics hooks once question-level telemetry is defined.
