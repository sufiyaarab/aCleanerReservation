// Menu page: the dishes, and the dietary filter chips.
// Tags: V vegetarian, GF gluten-free, DF dairy-free, N contains nuts, SF contains shellfish.
// To change the menu, edit MENU below. Prices and dishes are the same at both locations.
const MENU = [
  { section: 'Waffles', items: [
    ['Classic buttermilk waffle', 'Whipped butter and Ontario maple syrup', '$12', 'V'],
    ['Strawberry shortcake waffle', 'Fresh strawberries, whipped cream and maple syrup', '$15', 'V'],
    ['Maple pecan waffle', 'Candied pecans, brown butter and maple syrup', '$16', 'V N'],
    ['Chicken and waffle', 'Buttermilk fried chicken, hot honey and pickles', '$19', ''],
    ['Gluten-free berry waffle', 'Rice flour waffle, mixed berries and coconut cream', '$16', 'V GF DF'],
  ] },
  { section: 'Eggs and savoury', items: [
    ['Two eggs any style', 'Home fries, toast and bacon or grilled tomato', '$13', ''],
    ['Classic eggs Benedict', 'Poached eggs, peameal bacon and hollandaise on an English muffin', '$18', ''],
    ['Smoked salmon Benedict', 'Poached eggs, smoked salmon, capers and hollandaise', '$20', ''],
    ['Shakshuka', 'Eggs baked in spiced tomato sauce, feta and grilled bread', '$17', 'V'],
    ['Avocado toast', 'Sourdough, smashed avocado, chili flakes and a poached egg', '$15', 'V DF'],
    ['Shrimp and grits', 'Garlic shrimp, cheddar grits and green onion', '$21', 'GF SF'],
  ] },
  { section: 'Bowls and lighter', items: [
    ['Harvest grain bowl', 'Quinoa, roasted squash, kale, tahini and a soft egg', '$16', 'V GF DF'],
    ['Yogurt parfait', 'Greek yogurt, house almond granola, berries and honey', '$10', 'V N'],
    ['Fruit plate', 'Seasonal fruit with fresh mint', '$9', 'V GF DF'],
  ] },
  { section: 'Sides', items: [
    ['Home fries', 'Crispy potatoes with herbs', '$6', 'V GF DF'],
    ['Thick-cut bacon', 'Three strips', '$6', 'GF DF'],
    ['Toast and jam', 'Sourdough or multigrain', '$4', 'V'],
    ['Single waffle', 'With maple syrup', '$7', 'V'],
  ] },
  { section: 'Drinks', items: [
    ['Drip coffee', 'Free refills', '$3.50', 'V GF DF'],
    ['Latte', 'Oat milk at no extra cost', '$5.50', 'V GF'],
    ['Fresh orange juice', 'Squeezed every morning', '$6', 'V GF DF'],
    ['Mimosa', 'Sparkling wine and orange juice, 19+', '$9', 'V GF DF'],
  ] },
];
const TAG_NAMES = { V: 'Vegetarian', GF: 'Gluten-free', DF: 'Dairy-free', N: 'Contains nuts', SF: 'Contains shellfish' };

(function () {
  const box = document.getElementById('menu');
  box.innerHTML = MENU.map((s, si) => `
    <section class="menu-section" aria-labelledby="menu-s${si}">
      <h2 id="menu-s${si}">${esc(s.section)}</h2>
      <ul class="menu-list">${s.items.map(([name, desc, price, tags]) => `
        <li class="menu-item" data-tags="${tags}">
          <h3>${esc(name)}</h3><span class="price">${price}</span>
          <p>${esc(desc)}</p>
          ${tags ? `<span class="tags">${tags.split(' ').map(t => `<abbr class="tag" title="${TAG_NAMES[t]}">${t}</abbr>`).join('')}</span>` : ''}
        </li>`).join('')}
      </ul>
    </section>`).join('');

  const chips = [...document.querySelectorAll('#menu-filter .chip')];
  const items = [...box.querySelectorAll('.menu-item')];
  function apply() {
    const need = chips.filter(c => c.getAttribute('aria-pressed') === 'true');
    let shown = 0;
    items.forEach(li => {
      const tags = li.dataset.tags.split(' ');
      const ok = need.every(c => c.dataset.tag ? tags.includes(c.dataset.tag) : !tags.includes(c.dataset.without));
      li.hidden = !ok;
      if (ok) shown++;
    });
    // hide a whole section when none of its dishes fit
    box.querySelectorAll('.menu-section').forEach(sec => { sec.hidden = !sec.querySelector('.menu-item:not([hidden])'); });
    document.getElementById('menu-count').textContent = need.length ? `Showing ${shown} of ${items.length} dishes.` : '';
    document.getElementById('menu-empty').hidden = shown > 0;
  }
  chips.forEach(c => c.addEventListener('click', () => {
    c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    apply();
  }));
  apply();
})();
