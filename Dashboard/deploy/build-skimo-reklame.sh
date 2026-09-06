#!/usr/bin/env bash
# Skimo-kontrolpanel-reklame.mp4 — Matrix/gaming-titler (animeret baggrund + neon-tekst),
# kort intro før hvert spil, derefter ren gameplay uden overlay. Dashboard/guide uden tekst.
# Segment-sum matcher MP3 (typisk ~78 s).
#
# Valgfri: deploy/reklame-segment-secs.txt — præcis 12 tal (s): titel1, titel2, dashboard,
# guide, derefter 8 spil-blokke (intro+længde af gameplay i én sum pr. spil).
# Miljø: SKIMO_REKLAME_SEGS, SKIMO_GAME_INTRO_SEC (default 2.2), GUIDE_VIDEO
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FFMPEG="${FFMPEG:-/opt/homebrew/bin/ffmpeg}"
FFPROBE="${FFPROBE:-$(dirname "$FFMPEG")/ffprobe}"
[[ -x "$FFPROBE" ]] || FFPROBE="$(command -v ffprobe)"
MAGICK="${MAGICK:-/opt/homebrew/bin/magick}"
[[ -x "$FFMPEG" ]] || FFMPEG="$(command -v ffmpeg)"
[[ -x "$MAGICK" ]] || MAGICK="$(command -v magick)"
[[ -x "$FFMPEG" ]] || { echo "ffmpeg mangler"; exit 1; }
[[ -x "$MAGICK" ]] || { echo "magick mangler (brew install imagemagick) — titler kræver ImageMagick"; exit 1; }

AUDIO="elude_-_Topic_-_DARK_AURA_FUNK_Slowed_(SkySound.cc).mp3"
OUT="Skimo-kontrolpanel-reklame.mp4"
GUIDE_VIDEO="${GUIDE_VIDEO:-Videoer/guidevideo.mov}"

NUM_GAMES=8
NUM_SEGS=$((2 + 1 + 1 + NUM_GAMES))

FONT_MONO="${SKIMO_MATRIX_FONT:-/System/Library/Fonts/Supplemental/Courier New Bold.ttf}"
[[ -f "$FONT_MONO" ]] || FONT_MONO="/System/Library/Fonts/Supplemental/Arial Bold.ttf"

# Sekunder intro inde i hvert spil-segment (rest = gameplay)
GAME_INTRO_SEC="${SKIMO_GAME_INTRO_SEC:-2.2}"

hero="Videoer/dashboardcs.mp4"

GAMES=(
  "Videoer/Minecraft.mp4"
  "Videoer/Sims.mp4"
  "Videoer/GTA.mp4"
  "Videoer/Fallout.mov"
  "Videoer/Stardew.mov"
  "Videoer/Baldurs gate.mov"
  "Videoer/skylines.mov"
  "Videoer/Skyrim.mp4"
)

# Titel på gaming-intro (linje 1) — linje 2 fælles "NOW PLAYING"
GAME_TITLES=(
  "MINECRAFT"
  "THE SIMS"
  "GRAND THEFT AUTO"
  "FALLOUT"
  "STARDEW VALLEY"
  "BALDUR'S GATE"
  "CITIES: SKYLINES"
  "SKYRIM"
)

SEGS_DEFAULT=(4 3 15 8 6 6 6 6 6 6 6 6)

load_segments() {
  SEGS=()
  local f="${SKIMO_REKLAME_SEGS:-$ROOT/deploy/reklame-segment-secs.txt}"
  [[ -f "$f" ]] || return 1
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="${line//[$'\t\r']/}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" ]] && continue
    SEGS+=("$line")
  done < "$f"
  if [[ "${#SEGS[@]}" -ne "$NUM_SEGS" ]]; then
    echo "Advarsel: $f skal have præcis $NUM_SEGS tal (fik ${#SEGS[@]})." >&2
    return 1
  fi
  local x
  for x in "${SEGS[@]}"; do
    awk -v v="$x" 'BEGIN { exit !(v + 0 > 0) }' || {
      echo "Advarsel: segmentværdi skal være > 0 (fik '$x')." >&2
      return 1
    }
  done
  return 0
}

if load_segments; then
  echo "Bruger segmentlængder fra ${SKIMO_REKLAME_SEGS:-deploy/reklame-segment-secs.txt}"
else
  SEGS=("${SEGS_DEFAULT[@]}")
fi

CARD1_D="${SEGS[0]}"
CARD2_D="${SEGS[1]}"
INTRO_D="${SEGS[2]}"
GUIDE_D="${SEGS[3]}"

[[ -f "$ROOT/$GUIDE_VIDEO" ]] || { echo "Mangler guide-video: $ROOT/$GUIDE_VIDEO"; exit 1; }
[[ "${#GAMES[@]}" -eq "$NUM_GAMES" ]] || { echo "Forvent $NUM_GAMES spil"; exit 1; }
[[ "${#GAME_TITLES[@]}" -eq "$NUM_GAMES" ]] || { echo "GAME_TITLES matcher ikke GAMES"; exit 1; }

TOTAL_D=$(printf '%s\n' "${SEGS[@]}" | awk '{s+=$1} END{printf "%.3f", s}')

AUDIO_D="78.000"
if [[ -x "$FFPROBE" ]]; then
  AUDIO_D=$("$FFPROBE" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$ROOT/$AUDIO" 2>/dev/null || echo "78")
fi
AUDIO_D=$(awk -v d="$AUDIO_D" 'BEGIN { printf "%.3f", d+0 }')

FIN_T=$(awk -v s="$TOTAL_D" -v a="$AUDIO_D" 'BEGIN { if (a+0 < s+0) print a+0; else print s+0 }')

TMP="$ROOT/deploy/.tmp_reklame_build"
rm -rf "$TMP"
mkdir -p "$TMP"

# Neon/gaming stills (ImageMagick) — ffmpeg her har typisk ikke drawtext; vi bruger PNG + motion i video.
mk_gaming_title_png() {
  local out="$1" main="$2" sub="$3"
  local ps=96
  ((${#main} > 22)) && ps=76
  ((${#main} > 34)) && ps=60
  "$MAGICK" -size 1920x1080 xc:'#010806' \
    \( -size 1920x1080 xc:black +noise Random -threshold 98.9% -fill '#00ff41' -opaque white -blur 0x1.45 -evaluate Multiply 0.82 \) \
    -compose Screen -composite \
    \( -size 1200x1200 radial-gradient:'rgba(0,255,110,0.48)-rgba(0,0,0,0)' \) -gravity center -compose Screen -composite \
    \( -size 2200x1400 gradient:'rgba(0,255,90,0.12)-rgba(0,0,0,0)' -rotate 10 \) -gravity center -compose Screen -composite \
    \( -size 1920x1080 xc:none -stroke 'rgba(0,255,120,0.35)' -strokewidth 2 \
        -draw "rectangle 72,72 1848,1008" -draw "rectangle 92,92 1828,988" \) \
    -gravity center -compose Over -composite \
    -font "$FONT_MONO" -pointsize 32 -fill '#9dffcc' -gravity north -annotate '+0+280' "$sub" \
    -font "$FONT_MONO" -pointsize "$ps" -interline-spacing 10 -fill '#00ff66' -stroke '#00331a' -strokewidth 3 \
    -gravity center -annotate '+0-25' "$main" \
    "$out"
}

# Bevægende titel: grain + hue-puls + vignette + fade (loop af PNG fra mk_gaming_title_png)
matrix_title_clip() {
  local out_mp4="$1" dur="$2" main="$3" sub="$4" slug="$5"
  mk_gaming_title_png "$TMP/t_${slug}.png" "$main" "$sub"
  local fade_out_st
  fade_out_st=$(awk -v d="$dur" 'BEGIN { x = (d + 0) - 0.38; if (x < 0.05) x = 0.05; printf "%.3f", x }')
  "$FFMPEG" -y -loop 1 -framerate 30 -i "$TMP/t_${slug}.png" \
    -vf "noise=alls=22:allf=u,eq=contrast=1.2:brightness=0.03:saturation=1.28,hue=H=0.55*sin(2*PI*t/4.8),vignette=angle=PI/4.8,fade=t=in:st=0:d=0.28,fade=t=out:st=${fade_out_st}:d=0.36,fps=30,format=yuv420p" \
    -an -t "${dur}" \
    -c:v libx264 -preset fast -crf 17 -pix_fmt yuv420p \
    "$out_mp4"
}

matrix_title_clip "$TMP/p000.mp4" "$CARD1_D" "WELCOME TO" "MODGUARD // CONTROL PANEL" "p000"
matrix_title_clip "$TMP/p001.mp4" "$CARD2_D" "SELECT RUNTIME" "FIND YOUR GAME — PICK A WORLD" "p001"

VF_SCALE="scale=1920:1080:force_original_aspect_ratio=increase:in_range=pc:out_range=tv"
VF_BASE="${VF_SCALE},crop=1920:1080,setsar=1,fps=30,format=yuv420p"
# Fuld matrix-grade på kontrol/guide
MATRIX_GRADE="eq=contrast=1.06:saturation=0.82,colorbalance=gs=0.12:bs=-0.05:rs=-0.02"
# Blødere på spil-footage (mindre “amatør-vasket” look)
GAME_GRADE="eq=contrast=1.03:saturation=0.94,colorbalance=gs=0.04:bs=-0.02:rs=-0.01"

"$FFMPEG" -y -stream_loop -1 -i "$ROOT/$hero" \
  -filter_complex "[0:v]trim=0:${INTRO_D},setpts=PTS-STARTPTS,${VF_BASE},${MATRIX_GRADE}[outv]" \
  -map "[outv]" -an -t "$INTRO_D" \
  -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p \
  "$TMP/p002.mp4"

"$FFMPEG" -y -i "$ROOT/$GUIDE_VIDEO" \
  -filter_complex "[0:v]trim=0:${GUIDE_D},setpts=PTS-STARTPTS,${VF_BASE},${MATRIX_GRADE}[outv]" \
  -map "[outv]" -an -t "$GUIDE_D" \
  -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p \
  "$TMP/p003.mp4"

split_game_block() {
  # Input: total sekunder for spil-blok. Output: intro_sec footage_sec via stdout
  awk -v g="$1" -v want="$GAME_INTRO_SEC" 'BEGIN {
    g = g + 0
    if (g <= 0) { print "0.000 0.000"; exit }
    intro = want
    if (intro > g - 0.35) intro = g - 0.35
    if (intro < 0.25) intro = 0.25
    foot = g - intro
    if (foot < 0.25) {
      foot = 0.25
      intro = g - foot
      if (intro < 0.15) intro = 0.15
    }
    printf "%.3f %.3f", intro, foot
  }'
}

for i in "${!GAMES[@]}"; do
  n=$(printf '%03d' "$((i + 4))")
  g="${GAMES[$i]}"
  gd="${SEGS[$((4 + i))]}"
  read -r intro_s foot_s <<<"$(split_game_block "$gd")"

  matrix_title_clip "$TMP/g${n}_intro.mp4" "$intro_s" "${GAME_TITLES[$i]}" "NOW PLAYING" "g${n}"

  "$FFMPEG" -y -stream_loop -1 -i "$ROOT/$g" \
    -filter_complex "[0:v]trim=0:${foot_s},setpts=PTS-STARTPTS,${VF_BASE},${GAME_GRADE}[outv]" \
    -map "[outv]" -an -t "$foot_s" \
    -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p \
    "$TMP/g${n}_body.mp4"

  {
    echo "file '$TMP/g${n}_intro.mp4'"
    echo "file '$TMP/g${n}_body.mp4'"
  } > "$TMP/g${n}_list.txt"

  "$FFMPEG" -y -f concat -safe 0 -i "$TMP/g${n}_list.txt" -c copy "$TMP/p${n}.mp4"
done

{
  shopt -s nullglob
  for f in "$TMP"/p*.mp4; do
    abs="$(cd "$(dirname "$f")" && pwd)/$(basename "$f")"
    echo "file '$abs'"
  done
} > "$TMP/list.txt"

"$FFMPEG" -y -f concat -safe 0 -i "$TMP/list.txt" -i "$ROOT/$AUDIO" \
  -map 0:v -map 1:a \
  -t "$FIN_T" \
  -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  "$ROOT/$OUT"

rm -rf "$TMP"

SZ=$(stat -f%z "$ROOT/$OUT" 2>/dev/null || stat -c%s "$ROOT/$OUT")
if [[ "${SZ:-0}" -lt 300000 ]]; then
  echo "FEJL: $OUT for lille (${SZ} bytes)."
  exit 1
fi

echo "Færdig: $ROOT/$OUT (ca. ${FIN_T}s video · MP3 ${AUDIO_D}s · segment-sum ${TOTAL_D}s · spil-intro ca. ${GAME_INTRO_SEC}s)"
