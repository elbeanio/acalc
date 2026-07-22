import { test, expect, type Page } from '@playwright/test';

// --- helpers ---------------------------------------------------------------

const editor = (page: Page, i: number) =>
  page.locator('.row-editor .cm-content').nth(i);
const result = (page: Page, i: number) => page.locator('.row-result').nth(i);
const rows = (page: Page) => page.locator('.row');

async function typeInRow(page: Page, i: number, text: string) {
  await editor(page, i).click();
  await page.keyboard.type(text);
}

async function clearFocusedRow(page: Page) {
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

// --- evaluation ------------------------------------------------------------

test('evaluates an expression as you type', async ({ page }) => {
  await typeInRow(page, 0, '2 + 3 * 4');
  await expect(result(page, 0)).toHaveText('14');
});

test('is decimal-correct (0.1 + 0.2 = 0.3)', async ({ page }) => {
  await typeInRow(page, 0, '0.1 + 0.2');
  await expect(result(page, 0)).toHaveText('0.3');
});

test('references an earlier row and ripples edits through the chain', async ({
  page,
}) => {
  await typeInRow(page, 0, '2 + 3');
  await page.keyboard.press('Enter'); // new row, focus moves to it
  await page.keyboard.type('$1 * 10'); // typed into the new row
  await expect(result(page, 0)).toHaveText('5');
  await expect(result(page, 1)).toHaveText('50');

  await editor(page, 0).click();
  await clearFocusedRow(page);
  await page.keyboard.type('2 + 8');
  await expect(result(page, 0)).toHaveText('10');
  await expect(result(page, 1)).toHaveText('100');
});

// --- CodeMirror behaviour --------------------------------------------------

test('$ opens the reference autocomplete and inserts a reference', async ({
  page,
}) => {
  await typeInRow(page, 0, '100');
  await page.keyboard.press('Enter');
  await page.keyboard.type('$');

  const popup = page.locator('.cm-tooltip-autocomplete');
  await expect(popup).toBeVisible();
  await expect(popup).toContainText('$1');

  await page.keyboard.press('Enter'); // accept the completion, not a new row
  await page.keyboard.type(' * 2');
  await expect(result(page, 1)).toHaveText('200');
});

test('Enter creates a new row and focuses it', async ({ page }) => {
  await typeInRow(page, 0, '10');
  await page.keyboard.press('Enter');
  await expect(rows(page)).toHaveCount(2);

  await page.keyboard.type('20'); // lands in the new row, not the old one
  await expect(result(page, 0)).toHaveText('10');
  await expect(result(page, 1)).toHaveText('20');
});

test('backspace stays within the focused row', async ({ page }) => {
  await typeInRow(page, 0, '2 + 3');
  await page.keyboard.press('Enter'); // empty second row, focused
  for (let i = 0; i < 5; i++) await page.keyboard.press('Backspace');

  await expect(rows(page)).toHaveCount(2); // the row is not deleted
  await expect(result(page, 0)).toHaveText('5'); // neighbour untouched
});

test('arrow up moves to the row above with the cursor at the end', async ({
  page,
}) => {
  await typeInRow(page, 0, '100');
  await page.keyboard.press('Enter');
  await page.keyboard.type('200');

  await page.keyboard.press('ArrowUp'); // into row 1, cursor at end
  await page.keyboard.type('5'); // appended → 1005
  await expect(result(page, 0)).toHaveText('1005');
  await expect(result(page, 1)).toHaveText('200');
});

test('focuses the first row on load, ready to type', async ({ page }) => {
  await expect(editor(page, 0)).toBeFocused();
  await page.keyboard.type('7 * 6'); // no click needed
  await expect(result(page, 0)).toHaveText('42');
});

test('Alt+ArrowUp moves a row up', async ({ page }) => {
  await typeInRow(page, 0, '1');
  await page.keyboard.press('Enter');
  await page.keyboard.type('2'); // rows: [1, 2], focus on row 2

  await page.keyboard.press('Alt+ArrowUp'); // move "2" above "1"
  await expect(result(page, 0)).toHaveText('2');
  await expect(result(page, 1)).toHaveText('1');
});

test('Cmd/Ctrl+Shift+Backspace deletes the focused row', async ({ page }) => {
  await typeInRow(page, 0, '10');
  await page.keyboard.press('Enter');
  await page.keyboard.type('20'); // rows: [10, 20], focus on row 2

  await page.keyboard.press('ControlOrMeta+Shift+Backspace');
  await expect(rows(page)).toHaveCount(1);
  await expect(result(page, 0)).toHaveText('10');
});

// --- undo ------------------------------------------------------------------

test('undo moves focus to the changed row', async ({ page }) => {
  await typeInRow(page, 0, '10');
  await page.keyboard.press('Enter');
  await page.keyboard.type('5'); // row 2 = "5"

  await editor(page, 0).click(); // move focus away, to row 1
  await page.keyboard.press('ControlOrMeta+z'); // undoes row 2's "5"
  await page.keyboard.type('9'); // focus should have jumped to row 2

  await expect(result(page, 1)).toHaveText('9');
  await expect(result(page, 0)).toHaveText('10'); // row 1 untouched
});

// --- errors ----------------------------------------------------------------

test('shows which reference is dangling', async ({ page }) => {
  await typeInRow(page, 0, '$99 + 1');
  await expect(result(page, 0)).toHaveText('#ref!($99)');
});

// --- stacks & persistence --------------------------------------------------

test('new stacks have isolated undo history', async ({ page }) => {
  await typeInRow(page, 0, '11'); // stack 1
  await page.getByRole('button', { name: 'New stack' }).click();
  await expect(page.getByRole('tab')).toHaveCount(2);

  await typeInRow(page, 0, '22'); // stack 2, row 1
  await expect(result(page, 0)).toHaveText('22');

  // Undo twice (per-character) clears stack 2 without touching stack 1.
  await page.keyboard.press('ControlOrMeta+z');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(result(page, 0)).toHaveText('');

  await page.getByRole('tab').first().click(); // back to stack 1
  await expect(result(page, 0)).toHaveText('11');
});

test('creating a tab is not undone by undo', async ({ page }) => {
  await page.getByRole('button', { name: 'New stack' }).click();
  await expect(page.getByRole('tab')).toHaveCount(2);
  await page.keyboard.press('ControlOrMeta+z'); // fresh tab, empty history
  await expect(page.getByRole('tab')).toHaveCount(2);
});

test('persists calculations across a reload', async ({ page }) => {
  await typeInRow(page, 0, '6 * 7');
  await expect(result(page, 0)).toHaveText('42');

  await page.reload();
  await expect(result(page, 0)).toHaveText('42');
});
