/**
 * Studio Tab Navigation UI Manager (<100 lines)
 * Handles active studio tab switching and scrollable navigation arrows.
 */

export function setupStudioTabs() {
  const tabButtons = Array.from(document.querySelectorAll('.studio-tab-btn'));
  const tabContents = document.querySelectorAll('.studio-tab-content');
  const tabBar = document.getElementById('studio-tab-bar');
  const tabNavLeft = document.getElementById('tab-nav-left');
  const tabNavRight = document.getElementById('tab-nav-right');

  const activateTab = (btn) => {
    if (!btn) return;
    const targetTabId = btn.getAttribute('data-tab');

    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    const targetContent = document.getElementById(targetTabId);
    if (targetContent) targetContent.classList.add('active');

    if (btn.scrollIntoView) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn));
  });

  if (tabNavLeft) {
    tabNavLeft.addEventListener('click', () => {
      const activeIdx = tabButtons.findIndex(b => b.classList.contains('active'));
      if (activeIdx > 0) {
        activateTab(tabButtons[activeIdx - 1]);
      } else if (tabBar) {
        tabBar.scrollBy({ left: -80, behavior: 'smooth' });
      }
    });
  }

  if (tabNavRight) {
    tabNavRight.addEventListener('click', () => {
      const activeIdx = tabButtons.findIndex(b => b.classList.contains('active'));
      if (activeIdx >= 0 && activeIdx < tabButtons.length - 1) {
        activateTab(tabButtons[activeIdx + 1]);
      } else if (tabBar) {
        tabBar.scrollBy({ left: 80, behavior: 'smooth' });
      }
    });
  }
}
