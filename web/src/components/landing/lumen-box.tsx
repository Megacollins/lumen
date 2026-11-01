/**
 * The Lumen box in 3D: a closed charcoal box with light at the seam of its lid and the wordmark on the lid, turning slowly.
 * Pure CSS 3D (styles in globals.css under .lbox), so it costs no JavaScript.
 * Matches public/images/case-lumen.jpg; stands still at a three-quarter angle for reduced motion.
 */
const W = 220; // width
const H = 140; // height
const D = 160; // depth

function Side({ w, transform, front, name }: { w: number; transform: string; front?: boolean; name?: boolean }) {
  return (
    <div className="lbox-face lbox-side" style={{ width: w, height: H, marginLeft: -w / 2, marginTop: -H / 2, transform }}>
      {name && <span className="lbox-name">lumen</span>}
      <span className="lbox-seam" />
      {front && <span className="lbox-latch" />}
    </div>
  );
}

function Cap({ transform, top }: { transform: string; top?: boolean }) {
  return (
    <div
      className={`lbox-face ${top ? "lbox-top" : "lbox-bottom"}`}
      style={{ width: W, height: D, marginLeft: -W / 2, marginTop: -D / 2, transform }}
    />
  );
}

export function LumenBox({ className }: { className?: string }) {
  return (
    <div
      className={`lbox-stage ${className ?? ""}`}
      role="img"
      aria-label="A closed charcoal box marked lumen, slowly turning, with warm golden light glowing from the seam of its lid"
    >
      <span className="lbox-floor-glow" aria-hidden />
      <span className="lbox-shadow" aria-hidden />
      <div className="lbox-tilt" aria-hidden>
        <div className="lbox-spin">
          <Side w={W} transform={`translateZ(${D / 2}px)`} front name />
          <Side w={W} transform={`rotateY(180deg) translateZ(${D / 2}px)`} name />
          <Side w={D} transform={`rotateY(90deg) translateZ(${W / 2}px)`} />
          <Side w={D} transform={`rotateY(-90deg) translateZ(${W / 2}px)`} />
          <Cap transform={`rotateX(90deg) translateZ(${H / 2}px)`} top />
          <Cap transform={`rotateX(-90deg) translateZ(${H / 2}px)`} />
        </div>
      </div>
    </div>
  );
}
