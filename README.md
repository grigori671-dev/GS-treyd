# GS-treyd
мой Treyd

## Загрузка изображений с конвертацией в WebP

Сервис на Express: принимает изображение, конвертирует его в WebP и сохраняет в S3.

```
multipart upload → multer (лимит размера, в памяти)
  → sharp: проверка формата по содержимому, лимит пикселей
  → поворот по EXIF, удаление метаданных
  → уменьшение до IMAGE_MAX_DIMENSION по длинной стороне
  → WebP (quality = WEBP_QUALITY, прозрачность и анимация сохраняются)
  → S3 PutObject (Content-Type: image/webp, Cache-Control: immutable)
```

Принимаются JPEG, PNG, WebP, GIF (включая анимированные), AVIF, HEIF, TIFF.

### Запуск

```bash
npm install
cp .env.example .env   # заполнить S3_BUCKET, AWS_REGION, ключи
export $(grep -v '^#' .env | xargs)
npm start
```

### API

`POST /images` — `multipart/form-data`, файл в поле `image`.

```bash
curl -F image=@photo.jpg http://localhost:3000/images
```

Ответ `201`:

```json
{
  "key": "images/2026/10/3f2b...e1.webp",
  "url": "https://my-bucket.s3.eu-central-1.amazonaws.com/images/2026/10/3f2b...e1.webp",
  "contentType": "image/webp",
  "width": 2560,
  "height": 1707,
  "size": 184213,
  "animated": false,
  "sourceFormat": "jpeg"
}
```

Ошибки: `400` — нет файла в поле `image`; `413` — файл больше `UPLOAD_MAX_BYTES`;
`415` — не изображение, неподдерживаемый формат или больше `IMAGE_MAX_INPUT_PIXELS`.

### Тесты

```bash
npm test
```

S3 в тестах подменяется хранилищем в памяти, сеть не нужна.
