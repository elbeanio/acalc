import { test, expect, type Page } from '@playwright/test';

// --- helpers ---------------------------------------------------------------
// Rows are dual-mode: only the row being edited has a `.cm-content`; the rest
// are typeset (`.row-rendered`). Helpers are row-scoped and click to edit.

const rowLoc = (page: Page, i: number) => page.locator('.row').nth(i);
const result = (page: Page, i: number) => rowLoc(page, i).locator('.row-result');
const rows = (page: Page) => page.locator('.row');
/** The single currently-editing row's editor content. */
const activeEditor = (page: Page) => page.locator('.cm-content');

async function editRow(page: Page, i: number) {
  await rowLoc(page, i).locator('.row-editor, .row-rendered').click();
}

async function typeInRow(page: Page, i: number, text: string) {
  await editRow(page, i);
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
  await expect(result(page, 0)).toHaveAttribute('data-value', '14');
});

test('is decimal-correct (0.1 + 0.2 = 0.3)', async ({ page }) => {
  await typeInRow(page, 0, '0.1 + 0.2');
  await expect(result(page, 0)).toHaveAttribute('data-value', '0.3');
});

test('references an earlier row and ripples edits through the chain', async ({
  page,
}) => {
  await typeInRow(page, 0, '2 + 3');
  await page.keyboard.press('Enter'); // new row, focus moves to it
  await page.keyboard.type('$1 * 10'); // typed into the new row
  await expect(result(page, 0)).toHaveAttribute('data-value', '5');
  await expect(result(page, 1)).toHaveAttribute('data-value', '50');

  await editRow(page, 0);
  await clearFocusedRow(page);
  await page.keyboard.type('2 + 8');
  await expect(result(page, 0)).toHaveAttribute('data-value', '10');
  await expect(result(page, 1)).toHaveAttribute('data-value', '100');
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
  await expect(result(page, 1)).toHaveAttribute('data-value', '200');
});

test('blurred rows are typeset, and clicking one returns to the editor', async ({
  page,
}) => {
  await typeInRow(page, 0, '1/2');
  await page.keyboard.press('Enter'); // row 0 blurs → typeset

  await expect(rowLoc(page, 0).locator('.row-rendered .katex')).toBeVisible();
  await expect(rowLoc(page, 0).locator('.cm-content')).toHaveCount(0);

  await editRow(page, 0); // click the typeset row
  await expect(rowLoc(page, 0).locator('.cm-content')).toBeVisible();
});

test('Enter creates a new row and focuses it', async ({ page }) => {
  await typeInRow(page, 0, '10');
  await page.keyboard.press('Enter');
  await expect(rows(page)).toHaveCount(2);

  await page.keyboard.type('20'); // lands in the new row, not the old one
  await expect(result(page, 0)).toHaveAttribute('data-value', '10');
  await expect(result(page, 1)).toHaveAttribute('data-value', '20');
});

test('backspace stays within the focused row', async ({ page }) => {
  await typeInRow(page, 0, '2 + 3');
  await page.keyboard.press('Enter'); // empty second row, focused
  for (let i = 0; i < 5; i++) await page.keyboard.press('Backspace');

  await expect(rows(page)).toHaveCount(2); // the row is not deleted
  await expect(result(page, 0)).toHaveAttribute('data-value', '5'); // neighbour untouched
});

test('arrow up moves to the row above with the cursor at the end', async ({
  page,
}) => {
  await typeInRow(page, 0, '100');
  await page.keyboard.press('Enter');
  await page.keyboard.type('200');

  await page.keyboard.press('ArrowUp'); // into row 1, cursor at end
  await page.keyboard.type('5'); // appended → 1005
  await expect(result(page, 0)).toHaveAttribute('data-value', '1005');
  await expect(result(page, 1)).toHaveAttribute('data-value', '200');
});

test('focuses the first row on load, ready to type', async ({ page }) => {
  await expect(activeEditor(page)).toBeFocused();
  await page.keyboard.type('7 * 6'); // no click needed
  await expect(result(page, 0)).toHaveAttribute('data-value', '42');
});

test('Alt+ArrowUp moves a row up', async ({ page }) => {
  await typeInRow(page, 0, '1');
  await page.keyboard.press('Enter');
  await page.keyboard.type('2'); // rows: [1, 2], focus on row 2

  await page.keyboard.press('Alt+ArrowUp'); // move "2" above "1"
  await expect(result(page, 0)).toHaveAttribute('data-value', '2');
  await expect(result(page, 1)).toHaveAttribute('data-value', '1');
});

test('Cmd/Ctrl+Shift+Backspace deletes the focused row', async ({ page }) => {
  await typeInRow(page, 0, '10');
  await page.keyboard.press('Enter');
  await page.keyboard.type('20'); // rows: [10, 20], focus on row 2

  await page.keyboard.press('ControlOrMeta+Shift+Backspace');
  await expect(rows(page)).toHaveCount(1);
  await expect(result(page, 0)).toHaveAttribute('data-value', '10');
});

// --- undo ------------------------------------------------------------------

test('undo moves focus to the changed row', async ({ page }) => {
  await typeInRow(page, 0, '10');
  await page.keyboard.press('Enter');
  await page.keyboard.type('5'); // row 2 = "5"

  await editRow(page, 0); // move focus away, to row 1
  await page.keyboard.press('ControlOrMeta+z'); // undoes row 2's "5"
  await expect(activeEditor(page)).toBeFocused(); // focus jumps to row 2
  await page.keyboard.type('9');

  await expect(result(page, 1)).toHaveAttribute('data-value', '9');
  await expect(result(page, 0)).toHaveAttribute('data-value', '10'); // row 1 untouched
});

// --- errors ----------------------------------------------------------------

test('shows which reference is dangling', async ({ page }) => {
  await typeInRow(page, 0, '$99 + 1');
  await expect(result(page, 0)).toHaveAttribute('data-value', '#ref!($99)');
});

// --- stacks & persistence --------------------------------------------------

test('new stacks have isolated undo history', async ({ page }) => {
  await typeInRow(page, 0, '11'); // stack 1
  await page.getByRole('button', { name: 'New stack' }).click();
  await expect(page.getByRole('tab')).toHaveCount(2);

  await typeInRow(page, 0, '22'); // stack 2, row 1
  await expect(result(page, 0)).toHaveAttribute('data-value', '22');

  // Undo twice (per-character) clears stack 2 without touching stack 1.
  await page.keyboard.press('ControlOrMeta+z');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(result(page, 0)).toHaveAttribute('data-value', '');

  await page.getByRole('tab').first().click(); // back to stack 1
  await expect(result(page, 0)).toHaveAttribute('data-value', '11');
});

test('creating a tab is not undone by undo', async ({ page }) => {
  await page.getByRole('button', { name: 'New stack' }).click();
  await expect(page.getByRole('tab')).toHaveCount(2);
  await page.keyboard.press('ControlOrMeta+z'); // fresh tab, empty history
  await expect(page.getByRole('tab')).toHaveCount(2);
});

test('persists calculations across a reload', async ({ page }) => {
  await typeInRow(page, 0, '6 * 7');
  await expect(result(page, 0)).toHaveAttribute('data-value', '42');

  await page.reload();
  await expect(result(page, 0)).toHaveAttribute('data-value', '42');
});

// --- more coverage ---------------------------------------------------------

test('redo re-applies an undone edit', async ({ page }) => {
  await typeInRow(page, 0, '5');
  await page.keyboard.press('ControlOrMeta+z'); // undo the burst → empty
  await expect(result(page, 0)).toHaveAttribute('data-value', '');
  await page.keyboard.press('ControlOrMeta+Shift+z'); // redo
  await expect(result(page, 0)).toHaveAttribute('data-value', '5');
});

test('Alt+ArrowDown moves a row down', async ({ page }) => {
  await typeInRow(page, 0, '1');
  await page.keyboard.press('Enter');
  await page.keyboard.type('2'); // rows: [1, 2]
  await page.keyboard.press('ArrowUp'); // focus row "1"
  await page.keyboard.press('Alt+ArrowDown'); // move it below "2"
  await expect(result(page, 0)).toHaveAttribute('data-value', '2');
  await expect(result(page, 1)).toHaveAttribute('data-value', '1');
});

test('references a row by its name', async ({ page }) => {
  await typeInRow(page, 0, '100');
  await rowLoc(page, 0).locator('.row-name').fill('price');
  await rowLoc(page, 0).locator('.row-name').press('Enter');

  await page.getByText('+ Add row').click();
  await typeInRow(page, 1, '$price * 2');
  await expect(result(page, 1)).toHaveAttribute('data-value', '200');
});

test('deleting a referenced row leaves its dependent dangling', async ({
  page,
}) => {
  await typeInRow(page, 0, '50');
  await page.getByText('+ Add row').click();
  await typeInRow(page, 1, '$1 + 1');
  await expect(result(page, 1)).toHaveAttribute('data-value', '51');

  await rowLoc(page, 0).locator('.row-delete').click();
  await expect(rows(page)).toHaveCount(1);
  await expect(result(page, 0)).toHaveAttribute('data-value', '#ref!($1)');
});

test('detects a circular reference', async ({ page }) => {
  await typeInRow(page, 0, '$2');
  await page.getByText('+ Add row').click();
  await typeInRow(page, 1, '$1');
  await expect(result(page, 0)).toHaveAttribute('data-value', 'Circular reference');
  await expect(result(page, 1)).toHaveAttribute('data-value', 'Circular reference');
});

test('computes factorial', async ({ page }) => {
  await typeInRow(page, 0, '5!');
  await expect(result(page, 0)).toHaveAttribute('data-value', '120');

  await editRow(page, 0);
  await clearFocusedRow(page);
  await page.keyboard.type('(3 + 2)! + 1');
  await expect(result(page, 0)).toHaveAttribute('data-value', '121');
});

test('computes with units and converts', async ({ page }) => {
  await typeInRow(page, 0, '5 km + 300 m');
  await expect(result(page, 0)).toHaveAttribute('data-value', '5.3km');

  await editRow(page, 0);
  await clearFocusedRow(page);
  await page.keyboard.type('50 mph in km/h');
  await expect(result(page, 0)).toHaveAttribute('data-value', '80.4672km/h');

  await editRow(page, 0);
  await clearFocusedRow(page);
  await page.keyboard.type('20c in f'); // lowercase temperature
  await expect(result(page, 0)).toHaveAttribute('data-value', '68°F');
});

test('percent and modulo evaluate correctly', async ({ page }) => {
  await typeInRow(page, 0, '200 + 10%');
  await expect(result(page, 0)).toHaveAttribute('data-value', '200.1');

  await editRow(page, 0);
  await clearFocusedRow(page);
  await page.keyboard.type('10 % 3');
  await expect(result(page, 0)).toHaveAttribute('data-value', '1');
});

test('keeps full precision in the result tooltip', async ({ page }) => {
  await typeInRow(page, 0, '2 / 3');
  await expect(result(page, 0)).toHaveAttribute('data-value', '0.666666666667'); // 12 sig figs
  // The title carries the full-precision value (far more digits).
  await expect(result(page, 0)).toHaveAttribute('title', /^0\.6{20}/);
});

test('clicking outside a row switches it to the typeset view', async ({
  page,
}) => {
  await typeInRow(page, 0, '1/2');
  await page.locator('.app-header h1').click(); // focus leaves the stack
  await expect(rowLoc(page, 0).locator('.row-rendered .katex')).toBeVisible();
  await expect(rowLoc(page, 0).locator('.cm-content')).toHaveCount(0);
});

test('typesets a division as a KaTeX fraction', async ({ page }) => {
  await typeInRow(page, 0, '1/2');
  await page.keyboard.press('Enter'); // blur row 0
  const rendered = rowLoc(page, 0);
  await expect(rendered.locator('.row-rendered .katex')).toBeVisible();
  await expect(rendered.locator('.row-rendered .mfrac')).toBeVisible();
});

test('stacks keep independent content', async ({ page }) => {
  await typeInRow(page, 0, '111');
  await page.getByRole('button', { name: 'New stack' }).click();
  await typeInRow(page, 0, '222');
  await expect(result(page, 0)).toHaveAttribute('data-value', '222');

  await page.getByRole('tab').first().click();
  await expect(result(page, 0)).toHaveAttribute('data-value', '111');
  await page.getByRole('tab').nth(1).click();
  await expect(result(page, 0)).toHaveAttribute('data-value', '222');
});

test('deleting the only row shows the empty state', async ({ page }) => {
  await typeInRow(page, 0, '5');
  await rowLoc(page, 0).locator('.row-delete').click();
  await expect(rows(page)).toHaveCount(0);
  await expect(page.getByText('No rows yet.')).toBeVisible();
  await page.getByText('+ Add row').click();
  await expect(rows(page)).toHaveCount(1);
});

test('reformats the expression on blur', async ({ page }) => {
  await typeInRow(page, 0, '4*(4+4)');
  await page.keyboard.press('Enter'); // blur row 0 → reformat
  await editRow(page, 0); // re-open the editor
  await expect(activeEditor(page)).toHaveText('4 * (4 + 4)');
});

test('shows an = between the expression and the result', async ({ page }) => {
  await typeInRow(page, 0, '2 + 2');
  await expect(rowLoc(page, 0).locator('.row-eq')).toHaveText('=');
});

test('copies the displayed value (12 SF), matching the cell', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await typeInRow(page, 0, '2 / 3');
  await expect(result(page, 0)).toHaveAttribute('data-value', '0.666666666667'); // 12 sig figs
  await rowLoc(page, 0).locator('.row-copy').click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toBe('0.666666666667'); // what you see, no full-precision noise tail
});

test('renders references as chips without a dollar sign', async ({ page }) => {
  await typeInRow(page, 0, '5');
  await page.getByText('+ Add row').click();
  await typeInRow(page, 1, '$1 * 2');
  await page.locator('.app-header h1').click(); // blur → typeset

  const chip = rowLoc(page, 1).locator('.acalc-ref');
  await expect(chip).toHaveText('1');
  await expect(rowLoc(page, 1).locator('.row-rendered .katex')).not.toContainText('$');
});

test('the empty-row caret is full height', async ({ page }) => {
  await page.locator('.cm-content').click(); // focus the empty first row
  await expect(page.locator('.cm-cursor')).toHaveCount(1);
  const caretHeight = () =>
    page.evaluate(
      () => document.querySelector('.cm-cursor')?.getBoundingClientRect().height ?? 0,
    );
  const empty = await caretHeight();
  await page.keyboard.type('5');
  const filled = await caretHeight();
  expect(empty).toBeGreaterThan(10);
  expect(Math.abs(empty - filled)).toBeLessThan(2);

  // And the caret is actually visible (a coloured, non-transparent border).
  const colour = await page.evaluate(() => {
    const cursor = document.querySelector('.cm-cursor');
    return cursor ? getComputedStyle(cursor).borderLeftColor : '';
  });
  expect(colour).not.toBe('transparent');
  expect(colour).not.toMatch(/rgba\([^)]*,\s*0\)$/); // not fully transparent
});

test('the help cheat sheet opens, lists functions, and closes', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Help' }).click();
  await expect(page.getByRole('heading', { name: 'acalc cheat sheet' })).toBeVisible();
  // The "How it works" lead block (text unique to the dialog).
  await expect(page.getByText(/not a single number or operator/)).toBeVisible();
  await expect(page.getByText('square root')).toBeVisible();
  await expect(page.getByText('sqrt(16) = 4')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByText('square root')).not.toBeVisible();
});

test('the first-run primer teaches the model, then gets out of the way', async ({
  page,
}) => {
  const primer = page.getByText(/each row is one complete expression/i);
  await expect(primer).toBeVisible(); // shown on a fresh, empty stack

  // It opens the full cheat sheet.
  await page.getByRole('button', { name: /open the cheat sheet/i }).click();
  await expect(page.getByRole('heading', { name: 'acalc cheat sheet' })).toBeVisible();
  await page.keyboard.press('Escape');

  // It disappears the moment a row has content.
  await typeInRow(page, 0, '3 + 3');
  await expect(primer).toHaveCount(0);
});

test('the primer does not clutter new stacks', async ({ page }) => {
  const primer = page.getByText(/each row is one complete expression/i);
  await expect(primer).toBeVisible(); // first run
  await page.getByRole('button', { name: 'New stack' }).click();
  await expect(primer).toHaveCount(0); // empty, but no longer a first run
});

test('? opens help when not typing in a row', async ({ page }) => {
  await page.locator('.app-header').click(); // move focus out of the editor
  await page.keyboard.press('Shift+Slash'); // "?"
  await expect(page.getByText('square root')).toBeVisible();
});

test('editing a middle row ripples to all dependents', async ({ page }) => {
  await typeInRow(page, 0, '10');
  await page.keyboard.press('Enter');
  await page.keyboard.type('$1 * 2'); // row 2 = 20
  await page.keyboard.press('Enter');
  await page.keyboard.type('$2 + 5'); // row 3 = 25
  await expect(result(page, 1)).toHaveAttribute('data-value', '20');
  await expect(result(page, 2)).toHaveAttribute('data-value', '25');

  await editRow(page, 0);
  await clearFocusedRow(page);
  await page.keyboard.type('100');
  await expect(result(page, 1)).toHaveAttribute('data-value', '200');
  await expect(result(page, 2)).toHaveAttribute('data-value', '205');
});

test('shares a stack as a link that clones in on open', async ({
  page,
  context,
  browser,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await typeInRow(page, 0, '3 + 3'); // $1 = 6
  await page.keyboard.press('Enter');
  await page.keyboard.type('$1 * 2'); // $2 = 12

  await page.getByRole('button', { name: /shareable link/i }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain('#s=');

  // Open the link as a cold load in a fresh context (a recipient's browser,
  // with its own empty storage) — the shared stack clones in as a new tab.
  const recipient = await browser.newContext();
  const p2 = await recipient.newPage();
  await p2.goto(url);
  await expect(p2.getByRole('tab')).toHaveCount(2); // default + cloned
  await expect(result(p2, 0)).toHaveAttribute('data-value', '6');
  await expect(result(p2, 1)).toHaveAttribute('data-value', '12');
  expect(new URL(p2.url()).hash).toBe(''); // hash stripped, so a refresh won't re-clone
  await recipient.close();
});

test('a corrupt share link is ignored, not fatal', async ({ browser }) => {
  const recipient = await browser.newContext();
  const p2 = await recipient.newPage();
  await p2.goto('/#s=this-is-not-valid-data');
  await expect(p2.getByRole('tab')).toHaveCount(1); // just the default stack
  await expect(
    p2.getByRole('button', { name: /shareable link/i }),
  ).toBeVisible();
  await recipient.close();
});
