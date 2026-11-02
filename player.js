'use strict';
const $ = id => document.getElementById(id);
const audio = $('audio');
const tracks = (window.ZLOMBIE_TRACKS || []).filter(t => typeof t.title === 'string' && typeof t.url === 'string' && t.url.trim());
let active = -1;
let playbackCounted = false;
const time = n => Number.isFinite(n) ? Math.floor(n / 60) + ':' + String(Math.floor(n % 60)).padStart(2, '0') : '0:00';
const plural = n => n % 10 === 1 && n % 100 !== 11 ? 'трек' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'трека' : 'треков';

function downloadHref(track) {
  const href = track.downloadUrl || track.url;
  if (!track.filename) return href;
  try {
    const url = new URL(href);
    if (url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage/v1/object/public/')) {
      url.searchParams.set('download', track.filename);
      return url.href;
    }
  } catch {}
  return href;
}

function render() {
  const query = $('search').value.trim().toLocaleLowerCase('ru');
  $('tracks').replaceChildren();
  let found = 0;
  tracks.forEach((track, index) => {
    if (!track.title.toLocaleLowerCase('ru').includes(query)) return;
    found++;
    const row = document.createElement('div');
    row.className = 'track' + (active === index ? ' active' : '');
    const number = document.createElement('span');
    number.className = 'num';
    number.textContent = String(index + 1).padStart(2, '0');
    const play = document.createElement('button');
    play.className = 'play';
    const playing = active === index && !audio.paused;
    play.textContent = playing ? 'Ⅱ' : '▶';
    play.setAttribute('aria-label', (playing ? 'Пауза: ' : 'Слушать: ') + track.title);
    play.onclick = () => active === index ? toggle() : select(index, true);
    const title = document.createElement('strong');
    title.textContent = track.title;
    const download = document.createElement('a');
    download.href = downloadHref(track);
    download.download = track.filename || '';
    download.textContent = 'Скачать ↓';
    download.setAttribute('aria-label', 'Скачать: ' + track.title);
    download.onclick = () => window.ZLOMBIE_ANALYTICS?.trackDownload(track);
    row.append(number, play, title, download);
    $('tracks').append(row);
  });
  $('count').textContent = tracks.length ? (query ? 'Найдено: ' + found + ' из ' + tracks.length : tracks.length + ' ' + plural(tracks.length) + ' · Слушай или забирай с собой') : '';
  $('empty').classList.toggle('hidden', tracks.length > 0);
  $('no-results').classList.toggle('hidden', !tracks.length || found > 0);
}

function playbackError() {
  $('notice').textContent = 'Не удалось включить трек. Попробуй ещё раз или скачай файл.';
  $('state').textContent = 'Ошибка воспроизведения';
  syncControls();
}

function syncControls() {
  const playing = !audio.paused && active >= 0;
  $('toggle').textContent = playing ? 'Ⅱ' : '▶';
  $('toggle').setAttribute('aria-label', playing ? 'Пауза' : 'Воспроизвести');
  $('toggle').disabled = active < 0;
  $('prev').disabled = active <= 0;
  $('next').disabled = active < 0 || active >= tracks.length - 1;
  render();
}

function select(index, play) {
  if (index < 0 || index >= tracks.length) return;
  active = index;
  playbackCounted = false;
  audio.src = tracks[index].url;
  $('title').textContent = tracks[index].title;
  $('state').textContent = 'Zlombie · готово к прослушиванию';
  $('notice').textContent = '';
  $('seek').disabled = true;
  $('seek').value = 0;
  $('current').textContent = '0:00';
  $('duration').textContent = '0:00';
  syncControls();
  if (play) audio.play().catch(playbackError);
}

function toggle() {
  if (active < 0) return;
  if (audio.paused) audio.play().catch(playbackError);
  else audio.pause();
}

$('toggle').onclick = toggle;
$('prev').onclick = () => select(active - 1, true);
$('next').onclick = () => select(active + 1, true);
$('search').oninput = render;
audio.onplay = () => { $('state').textContent = 'Zlombie · играет'; syncControls(); };
audio.onplaying = () => {
  if (!playbackCounted && active >= 0) {
    playbackCounted = true;
    window.ZLOMBIE_ANALYTICS?.trackPlayback(tracks[active]);
  }
};
audio.onpause = () => { $('state').textContent = 'Zlombie · пауза'; syncControls(); };
audio.onloadedmetadata = () => {
  $('duration').textContent = time(audio.duration);
  $('seek').disabled = !Number.isFinite(audio.duration);
};
audio.ontimeupdate = () => {
  $('current').textContent = time(audio.currentTime);
  $('seek').value = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration * 100 : 0;
};
$('seek').oninput = event => {
  if (Number.isFinite(audio.duration)) audio.currentTime = audio.duration * event.target.value / 100;
};
audio.onended = () => {
  playbackCounted = false;
  if (active < tracks.length - 1) select(active + 1, true);
  else { $('state').textContent = 'Zlombie · прослушано'; syncControls(); }
};
audio.onerror = playbackError;
$('search').disabled = !tracks.length;
if (tracks.length) select(0, false);
else render();
