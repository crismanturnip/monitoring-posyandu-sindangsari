type PosyanduLogoProps = {
  id: 'header' | 'footer' | 'auth';
};

/** Inline SVG so the public landing page does not depend on a separate image request. */
export function PosyanduLogo({ id }: PosyanduLogoProps) {
  const blue = `posyandu-blue-${id}`;
  const green = `posyandu-green-${id}`;
  const cross = `posyandu-cross-${id}`;
  const pulse = `posyandu-pulse-${id}`;

  return (
    <svg className="lp-logo" viewBox="0 0 1000 1040" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={blue} x1="83" y1="211" x2="814" y2="995" gradientUnits="userSpaceOnUse">
          <stop stopColor="#03a3d7" />
          <stop offset=".52" stopColor="#087ebc" />
          <stop offset="1" stopColor="#0469ae" />
        </linearGradient>
        <linearGradient id={green} x1="284" y1="20" x2="910" y2="879" gradientUnits="userSpaceOnUse">
          <stop stopColor="#87c73c" />
          <stop offset=".52" stopColor="#56b339" />
          <stop offset="1" stopColor="#329a3a" />
        </linearGradient>
        <linearGradient id={cross} x1="180" y1="461" x2="732" y2="476" gradientUnits="userSpaceOnUse">
          <stop stopColor="#087d8e" />
          <stop offset=".52" stopColor="#006579" />
          <stop offset="1" stopColor="#095364" />
        </linearGradient>
        <mask id={pulse} maskUnits="userSpaceOnUse" x="160" y="185" width="580" height="560">
          <path fill="#fff" d="M160 185h580v560H160z" />
          <path d="M232 480h130l30-10 27 40 30-119c3-13 11-14 16 1l42 196 29-123 18 19h123" stroke="#000" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
        </mask>
      </defs>

      <path fill={`url(#${green})`} d="M116 223C253 81 401 7 541 27c90 13 151 78 171 174-54-75-128-111-222-113-135-4-258 51-374 135Z" />
      <path fill={`url(#${green})`} d="M690 276c-4-111 51-190 143-226 45-18 91-23 125-21-7 105-36 181-104 224-43 28-100 35-164 23 37-69 90-123 158-168-68 25-121 76-158 168Z" />
      <path fill={`url(#${green})`} d="M793 272c103 84 147 201 134 341-13 139-94 268-224 346 92-160 137-297 137-430 0-103-16-187-47-257Z" />
      <path fill={`url(#${blue})`} d="M260 188C130 259 50 387 27 510 0 656 67 789 207 895l52-28C141 758 97 631 116 505c17-118 67-231 144-317Z" />
      <path fill={`url(#${blue})`} d="M170 792c76-44 152-43 239-11 72 26 152 47 216 31 28-7 52 6 52 30 0 21-20 32-50 36-63 9-123-13-188-25 49 66 121 88 199 65 74-21 138-77 186-141 23-30 52-29 59-1 11 45-41 116-104 163-94 69-236 96-376 69-122-23-219-73-284-138-22-22-13-51 51-78Z" />
      <path fill={`url(#${cross})`} mask={`url(#${pulse})`} d="M377 190h144c31 0 53 23 53 54v106h104c32 0 52 22 52 53v132c0 33-21 54-53 54H574v96c0 32-22 53-53 53H377c-31 0-51-21-51-53v-96H219c-33 0-53-22-53-54V403c0-32 21-53 53-53h107V244c0-31 20-54 51-54Z" />
    </svg>
  );
}
