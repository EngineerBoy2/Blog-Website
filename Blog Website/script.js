/* Modern Blog JS
 - posts dataset (could be loaded from server later)
 - search, filtering, tags, categories
 - comments saved in localStorage per-post
 - dark mode toggle persisted
 - share API with fallback
*/

const POSTS_KEY = 'demo_blog_posts_v1';
const COMMENTS_KEY = 'demo_blog_comments_v1';
const THEME_KEY = 'demo_blog_theme_v1';

const posts = [
  {
    id: 'p1',
    title: 'My First Blog Post',
    date: '2025-01-01',
    content: `<p>Welcome to this demo blog. This post introduces the blog features — search, tags, dark mode, comments stored locally, and social sharing.</p>
              <p>Experiment with the UI — everything runs fully in the browser.</p>`,
    image: 'https://picsum.photos/id/1015/900/500',
    tags: ['intro','feature'],
    category: 'General'
  },
  {
    id: 'p2',
    title: 'A Journey to the Mountains',
    date: '2025-01-10',
    content: `<p>A short travel-themed post. Mountains, fresh air, and stories from the trail.</p><p>Use tags and categories to filter posts.</p>`,
    image: 'https://picsum.photos/id/1005/900/500',
    tags: ['travel','outdoors'],
    category: 'Travel'
  },
  {
    id: 'p3',
    title: 'Technology and the Future',
    date: '2025-01-20',
    content: `<p>Thoughts on technology trends. Build, experiment, and iterate.</p>`,
    image: 'https://picsum.photos/id/1050/900/500',
    tags: ['tech','future'],
    category: 'Technology'
  },
  // add more posts if you like
];

/* ---------- Helpers ---------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* ---------- State ---------- */
let state = {
  query: '',
  activeTag: null,
  activeCategory: null,
  currentPost: null,
  posts: posts
};

/* ---------- Persisted theme ---------- */
function applyTheme(theme){
  if(theme === 'dark') document.body.classList.add('dark');
  else document.body.classList.remove('dark');
  localStorage.setItem(THEME_KEY, theme);
}
(function initTheme(){
  const t = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(t);
  $('#dark-toggle').textContent = t === 'dark' ? '☀️' : '🌙';
})();

/* ---------- Render categories & tags ---------- */
function unique(arr, fn){ return [...new Map(arr.map(x => [fn(x), x])).values()]; }

function getAllCategories(){
  return unique(state.posts.map(p => p.category), x=>x);
}
function getAllTags(){
  const tagset = new Set();
  state.posts.forEach(p => p.tags.forEach(t => tagset.add(t)));
  return Array.from(tagset).sort();
}

function renderCategories(){
  const list = $('#category-list');
  list.innerHTML = '';
  const allBtn = document.createElement('li');
  const btnAll = document.createElement('button');
  btnAll.textContent = 'All';
  btnAll.addEventListener('click', () => { state.activeCategory = null; render(); });
  allBtn.appendChild(btnAll);
  list.appendChild(allBtn);

  getAllCategories().forEach(cat => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = cat;
    btn.addEventListener('click', () => { state.activeCategory = cat; render(); });
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function renderTags(){
  const tc = $('#tag-cloud');
  tc.innerHTML = '';
  getAllTags().forEach(tag => {
    const el = document.createElement('button');
    el.className = 'tag';
    el.textContent = tag;
    el.addEventListener('click', () => {
      state.activeTag = state.activeTag === tag ? null : tag;
      render();
    });
    tc.appendChild(el);
  });
}

/* ---------- Post previews ---------- */
function renderPostPreviews(postsToShow){
  const grid = $('#posts-grid');
  grid.innerHTML = '';
  const tpl = document.getElementById('post-preview-tpl');

  postsToShow.forEach(post => {
    const node = tpl.content.cloneNode(true);
    const article = node.querySelector('.post-card');
    article.dataset.id = post.id;
    node.querySelector('.post-thumb').src = post.image;
    node.querySelector('.date').textContent = post.date;
    node.querySelector('.title').textContent = post.title;
    node.querySelector('.excerpt').textContent = (new DOMParser().parseFromString(post.content, 'text/html')).body.textContent.slice(0,140) + '…';
    node.querySelector('.tags').textContent = post.tags.map(t=>`#${t}`).join(' ');
    node.querySelector('.view-btn').addEventListener('click', () => openPost(post.id));
    node.querySelector('.share-btn').addEventListener('click', () => sharePost(post));
    grid.appendChild(node);
  });
}

/* ---------- Post single view ---------- */
function openPost(id){
  const post = state.posts.find(p=>p.id===id);
  if(!post) return;
  state.currentPost = post;
  $('#post-view').classList.remove('hidden');
  $('#posts-grid').classList.add('hidden');
  $('.toolbar').classList.add('hidden');
  $('#pv-title').textContent = post.title;
  $('#pv-date').textContent = post.date;
  $('#pv-image').src = post.image;
  $('#pv-content').innerHTML = post.content;
  // tags
  const tdiv = $('#pv-tags');
  tdiv.innerHTML = '';
  post.tags.forEach(t => {
    const b = document.createElement('button'); b.className='tag'; b.textContent = t;
    b.addEventListener('click', ()=>{ state.activeTag = t; $('#post-view').classList.add('hidden'); $('#posts-grid').classList.remove('hidden'); $('.toolbar').classList.remove('hidden'); render(); });
    tdiv.appendChild(b);
  });
  renderComments(post.id);
}

$('#back-to-list').addEventListener('click', ()=>{
  state.currentPost = null;
  $('#post-view').classList.add('hidden');
  $('#posts-grid').classList.remove('hidden');
  $('.toolbar').classList.remove('hidden');
});

/* ---------- Comments (pretty + animated) ---------- */

function getComments() {
  const raw = localStorage.getItem(COMMENTS_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveComments(obj) {
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(obj));
}

function renderComments(postId) {
  const all = getComments();
  const list = all[postId] || [];
  const container = document.getElementById("comments-list");
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = `<small>No comments yet — write something!</small>`;
    return;
  }

  list.forEach((c) => {
    const div = document.createElement("div");
    div.className = "comment";
    div.innerHTML = `
      <strong>${c.name}</strong>
      <small>${c.when}</small>
      <p>${c.text}</p>
    `;
    container.appendChild(div);
  });
}

document.getElementById("comment-form").addEventListener("submit", (e) => {
  e.preventDefault();

  if (!state.currentPost) return;

  const name = document.getElementById("comment-name").value.trim();
  const text = document.getElementById("comment-text").value.trim();

  if (!name || !text) return;

  const all = getComments();
  if (!all[state.currentPost.id]) all[state.currentPost.id] = [];

  all[state.currentPost.id].unshift({
    name,
    text,
    when: new Date().toLocaleString(),
  });

  saveComments(all);

  document.getElementById("comment-name").value = "";
  document.getElementById("comment-text").value = "";

  renderComments(state.currentPost.id);
});

document.getElementById("clear-comments").addEventListener("click", () => {
  if (!state.currentPost) return;
  const all = getComments();
  all[state.currentPost.id] = [];
  saveComments(all);
  renderComments(state.currentPost.id);
});


/* ---------- Search & filtering ---------- */
$('#search').addEventListener('input', (e)=>{
  state.query = e.target.value.trim().toLowerCase();
  render();
});

function matchesQuery(post){
  if(!state.query) return true;
  const hay = (post.title + ' ' + post.content + ' ' + post.tags.join(' ')).toLowerCase();
  return hay.includes(state.query);
}

function matchesTag(post){
  if(!state.activeTag) return true;
  return post.tags.includes(state.activeTag);
}

function matchesCategory(post){
  if(!state.activeCategory) return true;
  return post.category === state.activeCategory;
}

/* ---------- Searching/Filtering pipeline ---------- */
function render(){
  // chips
  const chips = $('#filter-chips');
  chips.innerHTML = '';
  if(state.activeTag){
    const c = document.createElement('div'); c.className='tag'; c.textContent = `Tag: ${state.activeTag}`;
    c.addEventListener('click', ()=>{ state.activeTag=null; render(); });
    chips.appendChild(c);
  }
  if(state.activeCategory){
    const c = document.createElement('div'); c.className='tag'; c.textContent = `Category: ${state.activeCategory}`;
    c.addEventListener('click', ()=>{ state.activeCategory=null; render(); });
    chips.appendChild(c);
  }
  if(state.query){
    const c = document.createElement('div'); c.className='tag'; c.textContent = `Search: ${state.query}`;
    c.addEventListener('click', ()=>{ state.query=''; $('#search').value=''; render(); });
    chips.appendChild(c);
  }

  const filtered = state.posts.filter(p => matchesQuery(p) && matchesTag(p) && matchesCategory(p))
                     .sort((a,b)=> b.date.localeCompare(a.date));
  renderPostPreviews(filtered);
  renderRecent(filtered.slice(0,5));
  renderCategories();
  renderTags();
}

/* ---------- Recent list ---------- */
function renderRecent(list){
  const ul = $('#recent-list'); ul.innerHTML = '';
  const items = list.slice(0,5);
  items.forEach(i=>{
    const li = document.createElement('li');
    li.innerHTML = `<a href="#" data-id="${i.id}">${i.title}</a>`;
    li.querySelector('a').addEventListener('click', (e)=>{ e.preventDefault(); openPost(i.id); });
    ul.appendChild(li);
  });
}

/* ---------- Share ---------- */
function sharePost(post){
  const payload = { title: post.title, text: post.title + ' — read more on this demo blog', url: location.href };
  if(navigator.share){
    navigator.share(payload).catch(()=>alert('Share cancelled'));
  } else {
    // simple fallback: copy to clipboard
    navigator.clipboard?.writeText(`${post.title} — ${location.href}`).then(()=> alert('Link copied to clipboard'));
  }
}
$('#pv-share').addEventListener('click', ()=>{ if(state.currentPost) sharePost(state.currentPost); });

function escapeHtml(s){ return s.replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; }); }

/* ---------- UI wiring ---------- */
$('#dark-toggle').addEventListener('click', ()=>{
  const isDark = document.body.classList.toggle('dark');
  const theme = isDark ? 'dark' : 'light';
  $('#dark-toggle').textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, theme);
});

$('#menu-toggle').addEventListener('click', ()=>{
  const nav = document.getElementById('main-nav');
  nav.classList.toggle('open');
  nav.style.display = nav.style.display === 'block' ? '' : 'block';
});

/* ---------- Init ---------- */
(function init(){
  // seed posts (optionally persist)
  if(!localStorage.getItem(POSTS_KEY)){
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  }
  // use persisted posts if present
  try{
    const raw = localStorage.getItem(POSTS_KEY);
    state.posts = raw ? JSON.parse(raw) : posts;
  }catch(e){ state.posts = posts; }

  // wire buttons on grid (delegation handled by rendering functions)
  document.addEventListener('click', (e)=>{
    if(e.target.matches('.post-card')) openPost(e.target.dataset.id);
  });

  // view initial
  render();
})();
