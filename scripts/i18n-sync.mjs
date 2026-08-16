/**
 * ko.json 기준으로 en/ja/es.json에 누락 키를 채웁니다.
 *
 * 사용법:
 *   npm run i18n:sync              # DeepL로 번역 (DEEPL_AUTH_KEY 필요)
 *   npm run i18n:sync -- --copy-ko # 번역 없이 한국어 값 복사
 *   npm run i18n:sync -- --dry-run # 변경 미리보기만
 *
 * DeepL 무료 API 키: https://www.deepl.com/pro-api
 *   PowerShell: $env:DEEPL_AUTH_KEY="your-key"
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LOCALES_DIR = path.join(ROOT, "locales");

const SOURCE = "ko";
const TARGETS = ["en", "ja", "es"];
const DEEPL_LANG = { en: "EN", ja: "JA", es: "ES" };

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const COPY_KO = args.includes("--copy-ko");

function flatten(obj, prefix = "") {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const dotPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flatten(value, dotPath));
    } else {
      out[dotPath] = value;
    }
  }
  return out;
}

function getNested(obj, dotPath) {
  return dotPath.split(".").reduce((acc, key) => acc?.[key], obj);
}

function setNested(obj, dotPath, value) {
  const keys = dotPath.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]] || typeof cur[keys[i]] !== "object") {
      cur[keys[i]] = {};
    }
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

function hasHangul(text) {
  return /[\uAC00-\uD7AF]/.test(text);
}

function reorderLikeSource(source, target) {
  if (
    !source ||
    typeof source !== "object" ||
    Array.isArray(source) ||
    typeof target !== "object"
  ) {
    return target;
  }

  const out = {};
  for (const key of Object.keys(source)) {
    if (key in target) {
      out[key] =
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
          ? reorderLikeSource(source[key], target[key])
          : target[key];
    }
  }
  for (const key of Object.keys(target)) {
    if (!(key in out)) out[key] = target[key];
  }
  return out;
}

async function translateBatch(texts, targetLang) {
  const authKey = process.env.DEEPL_AUTH_KEY;
  if (!authKey) return null;

  const apiUrl = authKey.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";

  const body = new URLSearchParams();
  body.set("source_lang", "KO");
  body.set("target_lang", DEEPL_LANG[targetLang]);
  for (const text of texts) body.append("text", text);

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${authKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepL API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.translations.map((item) => item.text);
}

async function resolveValue(dotPath, koValue, targetLang) {
  if (dotPath === "meta.htmlLang") return targetLang;

  if (typeof koValue !== "string") return koValue;
  if (!hasHangul(koValue)) return koValue;
  if (COPY_KO) return koValue;

  return null;
}

async function main() {
  const sourcePath = path.join(LOCALES_DIR, `${SOURCE}.json`);
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const sourceFlat = flatten(source);

  const useDeepL = !COPY_KO && Boolean(process.env.DEEPL_AUTH_KEY);
  if (!COPY_KO && !useDeepL && !DRY_RUN) {
    console.warn(
      "⚠ DEEPL_AUTH_KEY가 없습니다. --copy-ko로 한국어를 복사하거나 API 키를 설정하세요."
    );
    console.warn("  PowerShell: $env:DEEPL_AUTH_KEY=\"your-deepl-key\"");
    process.exit(1);
  }

  for (const lang of TARGETS) {
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    const target = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const targetFlat = flatten(target);

    const missing = Object.keys(sourceFlat).filter(
      (key) => targetFlat[key] === undefined
    );

    if (missing.length === 0) {
      console.log(`✓ ${lang}.json — 누락 키 없음`);
      continue;
    }

    console.log(`→ ${lang}.json — ${missing.length}개 키 추가`);

    const toTranslate = [];
    const translatePaths = [];

    for (const dotPath of missing) {
      const koValue = sourceFlat[dotPath];
      const special = await resolveValue(dotPath, koValue, lang);

      if (special !== null) {
        if (!DRY_RUN) setNested(target, dotPath, special);
        console.log(`  [${dotPath}] ${JSON.stringify(special)}`);
        continue;
      }

      toTranslate.push(koValue);
      translatePaths.push(dotPath);
    }

    if (toTranslate.length > 0) {
      if (DRY_RUN) {
        for (let i = 0; i < translatePaths.length; i++) {
          console.log(
            `  [${translatePaths[i]}] (번역 예정) ${JSON.stringify(toTranslate[i])}`
          );
        }
      } else if (useDeepL) {
        const CHUNK = 20;
        for (let i = 0; i < toTranslate.length; i += CHUNK) {
          const chunkTexts = toTranslate.slice(i, i + CHUNK);
          const chunkPaths = translatePaths.slice(i, i + CHUNK);
          const translated = await translateBatch(chunkTexts, lang);

          for (let j = 0; j < chunkPaths.length; j++) {
            setNested(target, chunkPaths[j], translated[j]);
            console.log(
              `  [${chunkPaths[j]}] ${JSON.stringify(translated[j])}`
            );
          }

          if (i + CHUNK < toTranslate.length) {
            await new Promise((r) => setTimeout(r, 500));
          }
        }
      }
    }

    if (!DRY_RUN) {
      const ordered = reorderLikeSource(source, target);
      fs.writeFileSync(
        filePath,
        `${JSON.stringify(ordered, null, 2)}\n`,
        "utf8"
      );
      console.log(`  ✓ ${lang}.json 저장 완료`);
    }
  }

  if (DRY_RUN) console.log("\n(dry-run — 파일 변경 없음)");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
