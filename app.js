/* =========================================================
 * Photo Cropper — обрезка фото для сайта
 * Возможности: загрузка (файл / drag&drop / вставка),
 * соотношение сторон, качество, форматы, поворот, отражение,
 * случайное имя файла.
 * Зависимость: Cropper.js
 * ========================================================= */

const $ = (id) => document.getElementById(id);

const fileInput     = $('fileInput');
const image         = $('image');
const cropBtn       = $('cropBtn');
const downloadLink  = $('downloadLink');
const dropZone      = $('dropZone');
const pasteBtn      = $('pasteBtn');

const ratioInput    = $('ratioInput');
const applyRatio    = $('applyRatio');
const freeRatio     = $('freeRatio');
const presets       = document.querySelectorAll('.presets button');

const formatSelect  = $('formatSelect');
const qualityRange  = $('qualityRange');
const qualityValue  = $('qualityValue');
const qualityField  = $('qualityField');
const maxWidthInput = $('maxWidthInput');

const filenameField = $('filenameField');
const filenameInput = $('filenameInput');
const sizeHint      = $('sizeHint');

/* Инструменты изображения */
const rotateLeft    = $('rotateLeft');
const rotateRight   = $('rotateRight');
const rotateRange   = $('rotateRange');
const rotateValue   = $('rotateValue');
const flipH         = $('flipH');
const flipV         = $('flipV');
const resetImage    = $('resetImage');

let cropper = null;
let currentBlobUrl = null;

/* Состояние отражения (Cropper.js хранит его отдельно) */
let scaleX = 1;
let scaleY = 1;

/* =========================================================
 * Случайное имя файла
 * ========================================================= */
function randomFilename(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  const cryptoObj = window.crypto || window.msCrypto;
  if (cryptoObj?.getRandomValues) {
    const arr = new Uint32Array(length);
    cryptoObj.getRandomValues(arr);
    for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  } else {
    for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/* =========================================================
 * Загрузка изображения
 * ========================================================= */
function loadImageFromBlob(blob, suggestedName) {
  if (!blob || !blob.type.startsWith('image/')) {
    alert('Это не изображение.');
    return;
  }

  if (cropper) { cropper.destroy(); cropper = null; }
  if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }

  downloadLink.hidden = true;
  sizeHint.hidden = true;
  filenameField.hidden = true;

  /* Сбрасываем состояние поворота и отражения */
  scaleX = 1;
  scaleY = 1;
  rotateRange.value = 0;
  rotateValue.textContent = '0°';

  const url = URL.createObjectURL(blob);
  currentBlobUrl = url;
  image.src = url;

  /* Имя по умолчанию — случайное */
  filenameInput.value = randomFilename(10);

  image.onload = () => {
    cropper = new Cropper(image, {
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 0.8,
      aspectRatio: NaN,
      background: false,
      responsive: true,
      guides: true,
      center: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      /* Включаем поддержку поворота и отражения */
      rotatable: true,
      scalable: true,
    });
    cropBtn.disabled = false;
    applyRatioFromInput();
  };
}

/* =========================================================
 * Выбор файла / drag&drop / вставка
 * ========================================================= */
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  loadImageFromBlob(file);
  fileInput.value = '';
});

['dragenter', 'dragover'].forEach(ev =>
  document.addEventListener(ev, (e) => {
    e.preventDefault();
    document.body.classList.add('dragover');
  })
);
['dragleave', 'drop'].forEach(ev =>
  document.addEventListener(ev, (e) => {
    if (ev === 'dragleave' && e.relatedTarget) return;
    document.body.classList.remove('dragover');
  })
);
document.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) loadImageFromBlob(file);
});

async function pasteFromClipboard() {
  try {
    if (!navigator.clipboard?.read) {
      alert('Браузер не поддерживает чтение буфера через кнопку. Используйте Ctrl+V.');
      return;
    }
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find(t => t.startsWith('image/'));
      if (imageType) {
        const blob = await item.getType(imageType);
        loadImageFromBlob(blob);
        return;
      }
    }
    alert('В буфере обмена нет изображения.');
  } catch (err) {
    alert('Не удалось прочитать буфер обмена. Разрешите доступ или используйте Ctrl+V.\n\n' + err.message);
  }
}
pasteBtn.addEventListener('click', pasteFromClipboard);

document.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (blob) { loadImageFromBlob(blob); e.preventDefault(); return; }
    }
  }
});

/* =========================================================
 * Соотношение сторон
 * ========================================================= */
function parseRatio(str) {
  if (!str) return NaN;
  str = str.trim().replace(',', '.');
  if (str.includes(':')) {
    const [a, b] = str.split(':').map(s => parseFloat(s));
    return (a && b) ? a / b : NaN;
  }
  if (str.includes('/')) {
    const [a, b] = str.split('/').map(s => parseFloat(s));
    return (a && b) ? a / b : NaN;
  }
  const n = parseFloat(str);
  return isNaN(n) ? NaN : n;
}

function applyRatioFromInput() {
  if (!cropper) return;
  const r = parseRatio(ratioInput.value);
  cropper.setAspectRatio(isNaN(r) ? NaN : r);
}

applyRatio.addEventListener('click', applyRatioFromInput);
ratioInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); applyRatioFromInput(); }
});
freeRatio.addEventListener('click', () => {
  ratioInput.value = '';
  if (cropper) cropper.setAspectRatio(NaN);
});
presets.forEach(btn => {
  btn.addEventListener('click', () => {
    ratioInput.value = btn.dataset.ratio;
    applyRatioFromInput();
  });
});

/* =========================================================
 * Поворот и отражение
 * ========================================================= */
function currentAngle() {
  return parseInt(rotateRange.value, 10) || 0;
}

rotateLeft.addEventListener('click', () => {
  if (!cropper) return;
  rotateRange.value = currentAngle() - 90;
  rotateValue.textContent = rotateRange.value + '°';
  cropper.rotate(-90);
});

rotateRight.addEventListener('click', () => {
  if (!cropper) return;
  rotateRange.value = currentAngle() + 90;
  rotateValue.textContent = rotateRange.value + '°';
  cropper.rotate(90);
});

rotateRange.addEventListener('input', () => {
  if (!cropper) return;
  const angle = currentAngle();
  rotateValue.textContent = angle + '°';
  /* Ставим абсолютный угол, вычитая уже применённый */
  cropper.rotateTo(angle);
});

flipH.addEventListener('click', () => {
  if (!cropper) return;
  scaleX = -scaleX;
  cropper.scaleX(scaleX);
});

flipV.addEventListener('click', () => {
  if (!cropper) return;
  scaleY = -scaleY;
  cropper.scaleY(scaleY);
});

resetImage.addEventListener('click', () => {
  if (!cropper) return;
  cropper.reset();
  scaleX = 1;
  scaleY = 1;
  rotateRange.value = 0;
  rotateValue.textContent = '0°';
  applyRatioFromInput();
});

/* =========================================================
 * Формат и качество
 * ========================================================= */
qualityRange.addEventListener('input', () => {
  qualityValue.textContent = qualityRange.value + '%';
});
formatSelect.addEventListener('change', () => {
  qualityField.classList.toggle('hidden', formatSelect.value === 'image/png');
  updateDownloadName();
});

/* =========================================================
 * Обрезка
 * ========================================================= */
cropBtn.addEventListener('click', () => {
  if (!cropper) return;

  const maxW = parseInt(maxWidthInput.value, 10) || 0;
  const opts = { imageSmoothingQuality: 'high' };
  if (maxW > 0) { opts.maxWidth = maxW; opts.maxHeight = maxW; }

  const canvas = cropper.getCroppedCanvas(opts);
  const format = formatSelect.value;
  const quality = parseInt(qualityRange.value, 10) / 100;

  canvas.toBlob((blob) => {
    if (!blob) {
      alert('Не удалось сохранить изображение в выбранном формате.');
      return;
    }
    if (downloadLink.href) URL.revokeObjectURL(downloadLink.href);
    downloadLink.href = URL.createObjectURL(blob);

    /* Генерируем новое случайное имя при каждом обрезании */
    filenameInput.value = randomFilename(10);
    updateDownloadName();

    downloadLink.hidden = false;
    filenameField.hidden = false;

    const kb = blob.size / 1024;
    const sizeText = kb > 1024
      ? (kb / 1024).toFixed(2) + ' МБ'
      : kb.toFixed(1) + ' КБ';
    sizeHint.textContent = `Готово: ${canvas.width}×${canvas.height} px, ${sizeText}`;
    sizeHint.hidden = false;
  }, format, format === 'image/png' ? undefined : quality);
});

/* =========================================================
 * Имя файла
 * ========================================================= */
function getExtension() {
  const f = formatSelect.value;
  return f === 'image/png' ? 'png' : f === 'image/webp' ? 'webp' : 'jpg';
}

function updateDownloadName() {
  const raw = filenameInput.value.trim() || randomFilename(10);
  const safe = raw.replace(/[\\/:*?"<>|]+/g, '_');
  downloadLink.download = `${safe}.${getExtension()}`;
}

filenameInput.addEventListener('input', updateDownloadName);
