import React, { useState } from 'react';
import { User } from '../../types';

export interface UserAvatarProps {
  user?: Partial<User> | null;
  name?: string;
  avatar?: string;
  gender?: 'male' | 'female';
  role?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showGenderBadge?: boolean;
  showStatusIndicator?: boolean;
  isOnline?: boolean;
  onClick?: () => void;
}

// ============================================================================
// BỘ VECTOR AVATAR CHUẨN CÔNG CHỨC NHÀ NƯỚC (NAM & NỮ)
// Phông nền xanh hành chính công vụ, trang phục chuẩn mực, tác phong đĩnh đạc
// ============================================================================

/** 1. NAM CÔNG CHỨC - Áo vest xanh than, sơ mi trắng, cà vạt đỏ công vụ & huy hiệu cờ đỏ sao vàng */
export const MaleAvatarSVG: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Nam cán bộ công chức (Vest cà vạt đỏ)"
  >
    {/* Phông xanh thẻ công vụ hành chính */}
    <rect width="100" height="100" rx="20" fill="url(#male_admin_bg)" />
    {/* Ánh sáng studio chiếu nhẹ sau gáy */}
    <circle cx="50" cy="38" r="32" fill="#60A5FA" opacity="0.22" />

    {/* Thân áo vest công sở sẫm màu */}
    <path
      d="M12 100C13.5 76 24 66 38 65L44 76L56 76L62 65C76 66 86.5 76 88 100H12Z"
      fill="#1E293B"
    />
    {/* Cổ áo vest sẫm ve notch lapels */}
    <path d="M26 67L42 90L34 91L20 73L26 67Z" fill="#0F172A" />
    <path d="M74 67L58 90L66 91L80 73L74 67Z" fill="#0F172A" />

    {/* Áo sơ mi trắng bên trong */}
    <path d="M38 65L50 82L62 65L57 57L43 57L38 65Z" fill="#FFFFFF" />
    {/* Cổ cồn sơ mi bẻ góc sắc nét */}
    <path d="M42 57L50 71L46 72L38 59Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.8" />
    <path d="M58 57L50 71L54 72L62 59Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.8" />

    {/* Cà vạt đỏ công vụ truyền thống */}
    <path d="M47 69L53 69L54.5 75L48.5 77.5L45.5 75L47 69Z" fill="#DC2626" />
    <path d="M48 77L52 77L54 96L50 100L46 96L48 77Z" fill="#B91C1C" />
    {/* Vệt bóng cà vạt */}
    <path d="M49 78L51 78L52.5 95L50 98L48 95L49 78Z" fill="#EF4444" opacity="0.6" />

    {/* Huy hiệu Cờ đỏ sao vàng / Phù hiệu công chức cài ve áo ngực trái */}
    <rect x="67" y="74" width="7" height="11" rx="1.5" fill="#DC2626" stroke="#FBBF24" strokeWidth="0.8" />
    <polygon points="70.5,76.5 71.3,79 73.8,79 71.8,80.5 72.5,83 70.5,81.5 68.5,83 69.2,80.5 67.2,79 69.7,79" fill="#FACC15" />
    <rect x="68" y="82.5" width="5" height="1.5" rx="0.5" fill="#FFFFFF" />

    {/* Cổ & Khuôn mặt */}
    <rect x="44" y="50" width="12" height="14" rx="3" fill="#FCD3B6" />
    <path d="M44 53C47 56 53 56 56 53V60C53 63 47 63 44 60V53Z" fill="#F8B88B" opacity="0.65" />

    {/* Cằm & Gương mặt chữ điền cương trực */}
    <path
      d="M50 20C36 20 31 29 31 42C31 52 38 60 50 60C62 60 69 52 69 42C69 29 64 20 50 20Z"
      fill="#FCD3B6"
    />

    {/* Tai hai bên */}
    <ellipse cx="30" cy="42" rx="3" ry="5.5" fill="#FCD3B6" />
    <ellipse cx="30" cy="42" rx="1.8" ry="3.5" fill="#F8B88B" />
    <ellipse cx="70" cy="42" rx="3" ry="5.5" fill="#FCD3B6" />
    <ellipse cx="70" cy="42" rx="1.8" ry="3.5" fill="#F8B88B" />

    {/* Mái tóc rẽ ngôi 7/3 gọn gàng, chỉn chu */}
    <path
      d="M30 38C29 27 36 17 50 17C62 17 70 23 70 36C70 38 68 32 65 30C58 26 45 28 38 33C33 36 31 38 30 38Z"
      fill="#0F172A"
    />
    <path d="M30 38L32 44L34 40L33 34Z" fill="#0F172A" />
    <path d="M70 38L68 44L66 40L67 34Z" fill="#0F172A" />
    <path d="M39 26C46 22 57 22 64 27C61 24 49 23 41 26Z" fill="#334155" opacity="0.5" />

    {/* Ngũ quan cán bộ nam: Lông mày rậm, ánh mắt sáng, nụ cười điềm đạm */}
    <path d="M36 36.5C39 35 44 35.2 46 37" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M54 37C56 35.2 61 35 64 36.5" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />

    <ellipse cx="41" cy="41.5" rx="2.5" ry="3" fill="#0F172A" />
    <circle cx="41.8" cy="40.8" r="0.9" fill="#FFFFFF" />
    <ellipse cx="59" cy="41.5" rx="2.5" ry="3" fill="#0F172A" />
    <circle cx="59.8" cy="40.8" r="0.9" fill="#FFFFFF" />

    <path d="M50 40.5V48L48 49H52" stroke="#EA580C" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.75" />
    <path d="M44.5 53.5C47 56 53 56 55.5 53.5" stroke="#B91C1C" strokeWidth="1.6" strokeLinecap="round" fill="none" />

    <defs>
      <linearGradient id="male_admin_bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1E3A8A" />
        <stop offset="0.55" stopColor="#1D4ED8" />
        <stop offset="1" stopColor="#1E40AF" />
      </linearGradient>
    </defs>
  </svg>
);

/** 2. NỮ CÔNG CHỨC - Áo dài đỏ truyền thống Việt Nam, cổ đứng viền vàng, hoa cài áo & nét đoan trang */
export const FemaleAvatarSVG: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Nữ cán bộ công chức (Áo dài truyền thống)"
  >
    {/* Phông xanh thẻ công vụ hành chính */}
    <rect width="100" height="100" rx="20" fill="url(#female_admin_bg)" />
    {/* Hào quang dịu dàng */}
    <circle cx="50" cy="38" r="32" fill="#60A5FA" opacity="0.22" />

    {/* Mái tóc đen dài buông sau vai */}
    <path
      d="M26 38C26 58 28 85 34 95H66C72 85 74 58 74 38C74 20 64 15 50 15C36 15 26 20 26 38Z"
      fill="#090D16"
    />

    {/* Áo Dài truyền thống Việt Nam màu đỏ thắm sang trọng */}
    <path
      d="M16 100C18 78 28 67 42 66L50 71L58 66C72 67 82 78 84 100H16Z"
      fill="#DC2626"
    />
    <path
      d="M16 100C24 82 34 72 44 68L50 71L56 68C66 72 76 82 84 100H16Z"
      fill="#B91C1C"
      opacity="0.35"
    />

    {/* Cổ áo dài đứng cao 2.5cm truyền thống viền vàng kim */}
    <path
      d="M42 66C42 59 58 59 58 66L55 68C55 62 45 62 45 68L42 66Z"
      fill="#B91C1C"
      stroke="#FACC15"
      strokeWidth="1"
    />

    {/* Đường cong tà áo dài & khuy áo */}
    <path d="M50 70C54 74 58 77 68 81" stroke="#FACC15" strokeWidth="0.9" strokeLinecap="round" fill="none" opacity="0.85" />
    {/* Huy hiệu hoa sen vàng bên ngực trái */}
    <circle cx="66" cy="78" r="3.8" fill="#FACC15" stroke="#B45309" strokeWidth="0.6" />
    <polygon points="66,75.8 66.8,77.5 68.6,77.5 67.2,78.6 67.7,80.3 66,79.2 64.3,80.3 64.8,78.6 63.4,77.5 65.2,77.5" fill="#DC2626" />

    {/* Cổ & Khuôn mặt thanh tú */}
    <rect x="45" y="51" width="10" height="13" rx="3" fill="#FCD3B6" />
    <path d="M45 53C47.5 56 52.5 56 55 53V58C52.5 61 47.5 61 45 58V53Z" fill="#F8B88B" opacity="0.55" />

    <path
      d="M50 22C37 22 33 31 33 42C33 53 39 60 50 60C61 60 67 53 67 42C67 31 63 22 50 22Z"
      fill="#FCD3B6"
    />

    {/* Hoa tai ngọc trai / vàng thanh lịch */}
    <ellipse cx="32" cy="43" rx="2.5" ry="4.5" fill="#FCD3B6" />
    <circle cx="31.8" cy="47" r="1.6" fill="#FEF08A" stroke="#CA8A04" strokeWidth="0.5" />
    <ellipse cx="68" cy="43" rx="2.5" ry="4.5" fill="#FCD3B6" />
    <circle cx="68.2" cy="47" r="1.6" fill="#FEF08A" stroke="#CA8A04" strokeWidth="0.5" />

    {/* Tóc mái vén đoan trang & lọn tóc suôn thả nhẹ trước vai */}
    <path
      d="M33 38C32 26 38 17 50 17C62 17 68 26 67 38C65 30 59 23 50 23C41 23 35 30 33 38Z"
      fill="#0F172A"
    />
    <path d="M33 34C36 25 43 23 50 23C44 26 38 31 36 38Z" fill="#0F172A" />
    {/* Lọn tóc buông trước vai */}
    <path d="M33 42C31 52 32 68 35 84C36 85 37 84 37 82C35 68 34 54 36 43Z" fill="#0F172A" />
    <path d="M40 21C45 19 55 19 60 21C56 20 44 20 40 21Z" fill="#334155" opacity="0.5" />

    {/* Ngũ quan thanh tú: Chân mày lá liễu, mắt sáng hiền hòa, môi cười mỉm */}
    <ellipse cx="38" cy="46.5" rx="4" ry="2.2" fill="#FDA4AF" opacity="0.45" />
    <ellipse cx="62" cy="46.5" rx="4" ry="2.2" fill="#FDA4AF" opacity="0.45" />

    <path d="M37 36C40 34.5 44 35 46 36.8" stroke="#0F172A" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <path d="M54 36.8C56 35 60 34.5 63 36" stroke="#0F172A" strokeWidth="1.6" strokeLinecap="round" fill="none" />

    <path d="M38 40.5C40 39 43 39 45 40.5" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <ellipse cx="41.5" cy="41.8" rx="2.4" ry="2.6" fill="#0F172A" />
    <circle cx="42.3" cy="41" r="0.8" fill="#FFFFFF" />

    <path d="M55 40.5C57 39 60 39 62 40.5" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <ellipse cx="58.5" cy="41.8" rx="2.4" ry="2.6" fill="#0F172A" />
    <circle cx="59.3" cy="41" r="0.8" fill="#FFFFFF" />

    <path d="M50 41V47.5L48.8 48.5H51.2" stroke="#EA580C" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />

    <path d="M45.5 53.5C48 56 52 56 54.5 53.5" stroke="#E11D48" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <path d="M47 53.2C48.5 52.3 51.5 52.3 53 53.2" stroke="#BE123C" strokeWidth="1.2" strokeLinecap="round" fill="none" />

    <defs>
      <linearGradient id="female_admin_bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1E3A8A" />
        <stop offset="0.55" stopColor="#2563EB" />
        <stop offset="1" stopColor="#1D4ED8" />
      </linearGradient>
    </defs>
  </svg>
);

/** 3. NAM CÔNG CHỨC - Áo vest đen, cà vạt xanh navy lịch lãm */
export const MaleVestBlueAvatarSVG: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="100" height="100" rx="20" fill="url(#male_blue_bg)" />
    <circle cx="50" cy="38" r="32" fill="#93C5FD" opacity="0.2" />
    <path d="M12 100C13.5 76 24 66 38 65L44 76L56 76L62 65C76 66 86.5 76 88 100H12Z" fill="#0F172A" />
    <path d="M26 67L42 90L34 91L20 73L26 67Z" fill="#1E293B" />
    <path d="M74 67L58 90L66 91L80 73L74 67Z" fill="#1E293B" />
    <path d="M38 65L50 82L62 65L57 57L43 57L38 65Z" fill="#FFFFFF" />
    <path d="M42 57L50 71L46 72L38 59Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="0.8" />
    <path d="M58 57L50 71L54 72L62 59Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="0.8" />
    <path d="M47 69L53 69L54.5 75L48.5 77.5L45.5 75L47 69Z" fill="#1D4ED8" />
    <path d="M48 77L52 77L54 96L50 100L46 96L48 77Z" fill="#1E40AF" />
    <rect x="67" y="74" width="7" height="11" rx="1.5" fill="#DC2626" stroke="#FBBF24" strokeWidth="0.8" />
    <polygon points="70.5,76.5 71.3,79 73.8,79 71.8,80.5 72.5,83 70.5,81.5 68.5,83 69.2,80.5 67.2,79 69.7,79" fill="#FACC15" />
    <rect x="44" y="50" width="12" height="14" rx="3" fill="#FCD3B6" />
    <path d="M50 20C36 20 31 29 31 42C31 52 38 60 50 60C62 60 69 52 69 42C69 29 64 20 50 20Z" fill="#FCD3B6" />
    <ellipse cx="30" cy="42" rx="3" ry="5.5" fill="#FCD3B6" />
    <ellipse cx="70" cy="42" rx="3" ry="5.5" fill="#FCD3B6" />
    <path d="M30 38C29 27 36 17 50 17C62 17 70 23 70 36C70 38 68 32 65 30C58 26 45 28 38 33C33 36 31 38 30 38Z" fill="#0F172A" />
    <path d="M36 36.5C39 35 44 35.2 46 37" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M54 37C56 35.2 61 35 64 36.5" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
    <ellipse cx="41" cy="41.5" rx="2.5" ry="3" fill="#0F172A" />
    <circle cx="41.8" cy="40.8" r="0.9" fill="#FFFFFF" />
    <ellipse cx="59" cy="41.5" rx="2.5" ry="3" fill="#0F172A" />
    <circle cx="59.8" cy="40.8" r="0.9" fill="#FFFFFF" />
    <path d="M50 40.5V48L48 49H52" stroke="#EA580C" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.75" />
    <path d="M44.5 53.5C47 56 53 56 55.5 53.5" stroke="#B91C1C" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <defs>
      <linearGradient id="male_blue_bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0F172A" />
        <stop offset="0.5" stopColor="#1E3A8A" />
        <stop offset="1" stopColor="#1D4ED8" />
      </linearGradient>
    </defs>
  </svg>
);

/** 4. NỮ CÔNG CHỨC - Vest công sở hiện đại, áo sơ mi trắng, cài thẻ công vụ */
export const FemaleOfficeVestSVG: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="100" height="100" rx="20" fill="url(#female_vest_bg)" />
    <circle cx="50" cy="38" r="32" fill="#93C5FD" opacity="0.2" />
    <path d="M26 38C26 58 28 85 34 95H66C72 85 74 58 74 38C74 20 64 15 50 15C36 15 26 20 26 38Z" fill="#090D16" />
    <path d="M12 100C13.5 76 24 66 38 65L44 76L56 76L62 65C76 66 86.5 76 88 100H12Z" fill="#1E293B" />
    <path d="M28 66L45 88L37 89L22 72L28 66Z" fill="#0F172A" />
    <path d="M72 66L55 88L63 89L78 72L72 66Z" fill="#0F172A" />
    <path d="M38 65L50 82L62 65L56 56L44 56L38 65Z" fill="#FFFFFF" />
    <path d="M42 56L50 71L46 72L38 58Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="0.8" />
    <path d="M58 56L50 71L54 72L62 58Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="0.8" />
    <circle cx="67" cy="76" r="3.2" fill="#FACC15" stroke="#B45309" strokeWidth="0.6" />
    <rect x="45" y="51" width="10" height="13" rx="3" fill="#FCD3B6" />
    <path d="M50 22C37 22 33 31 33 42C33 53 39 60 50 60C61 60 67 53 67 42C67 31 63 22 50 22Z" fill="#FCD3B6" />
    <circle cx="31.8" cy="46" r="1.6" fill="#FEF08A" stroke="#CA8A04" strokeWidth="0.5" />
    <circle cx="68.2" cy="46" r="1.6" fill="#FEF08A" stroke="#CA8A04" strokeWidth="0.5" />
    <path d="M33 38C32 26 38 17 50 17C62 17 68 26 67 38C65 30 59 23 50 23C41 23 35 30 33 38Z" fill="#0F172A" />
    <ellipse cx="38" cy="46.5" rx="4" ry="2.2" fill="#FDA4AF" opacity="0.45" />
    <ellipse cx="62" cy="46.5" rx="4" ry="2.2" fill="#FDA4AF" opacity="0.45" />
    <path d="M37 36C40 34.5 44 35 46 36.8" stroke="#0F172A" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <path d="M54 36.8C56 35 60 34.5 63 36" stroke="#0F172A" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <ellipse cx="41.5" cy="41.8" rx="2.4" ry="2.6" fill="#0F172A" />
    <circle cx="42.3" cy="41" r="0.8" fill="#FFFFFF" />
    <ellipse cx="58.5" cy="41.8" rx="2.4" ry="2.6" fill="#0F172A" />
    <circle cx="59.3" cy="41" r="0.8" fill="#FFFFFF" />
    <path d="M50 41V47.5L48.8 48.5H51.2" stroke="#EA580C" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6" />
    <path d="M45.5 53.5C48 56 52 56 54.5 53.5" stroke="#E11D48" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <defs>
      <linearGradient id="female_vest_bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1E3A8A" />
        <stop offset="0.6" stopColor="#3B82F6" />
        <stop offset="1" stopColor="#1D4ED8" />
      </linearGradient>
    </defs>
  </svg>
);

/** 5. NAM CÔNG CHỨC - Sơ mi trắng ngắn tay, cầu vai & thẻ đeo công vụ */
export const MaleShirtAvatarSVG: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="100" height="100" rx="20" fill="url(#male_shirt_bg)" />
    <circle cx="50" cy="38" r="32" fill="#93C5FD" opacity="0.2" />
    {/* Sơ mi trắng công vụ */}
    <path d="M12 100C13.5 76 25 65 38 64L50 72L62 64C75 65 86.5 76 88 100H12Z" fill="#F8FAFC" />
    <path d="M50 72V100" stroke="#CBD5E1" strokeWidth="1.2" />
    <circle cx="50" cy="80" r="1.2" fill="#94A3B8" />
    <circle cx="50" cy="90" r="1.2" fill="#94A3B8" />
    {/* Cổ cồn sơ mi trắng */}
    <path d="M40 56L50 71L46 72L36 60Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8" />
    <path d="M60 56L50 71L54 72L64 60Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8" />
    {/* Dây thẻ công vụ xanh */}
    <path d="M43 66L49 84" stroke="#2563EB" strokeWidth="1.8" />
    <path d="M57 66L51 84" stroke="#2563EB" strokeWidth="1.8" />
    <rect x="44" y="84" width="12" height="15" rx="1" fill="#FFFFFF" stroke="#2563EB" strokeWidth="0.8" />
    <rect x="46" y="87" width="8" height="5" fill="#3B82F6" />
    <rect x="44" y="50" width="12" height="14" rx="3" fill="#FCD3B6" />
    <path d="M50 20C36 20 31 29 31 42C31 52 38 60 50 60C62 60 69 52 69 42C69 29 64 20 50 20Z" fill="#FCD3B6" />
    <ellipse cx="30" cy="42" rx="3" ry="5.5" fill="#FCD3B6" />
    <ellipse cx="70" cy="42" rx="3" ry="5.5" fill="#FCD3B6" />
    <path d="M30 38C29 27 36 17 50 17C62 17 70 23 70 36C70 38 68 32 65 30C58 26 45 28 38 33C33 36 31 38 30 38Z" fill="#0F172A" />
    <path d="M36 36.5C39 35 44 35.2 46 37" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M54 37C56 35.2 61 35 64 36.5" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
    <ellipse cx="41" cy="41.5" rx="2.5" ry="3" fill="#0F172A" />
    <circle cx="41.8" cy="40.8" r="0.9" fill="#FFFFFF" />
    <ellipse cx="59" cy="41.5" rx="2.5" ry="3" fill="#0F172A" />
    <circle cx="59.8" cy="40.8" r="0.9" fill="#FFFFFF" />
    <path d="M50 40.5V48L48 49H52" stroke="#EA580C" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.75" />
    <path d="M44.5 53.5C47 56 53 56 55.5 53.5" stroke="#B91C1C" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <defs>
      <linearGradient id="male_shirt_bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1E3A8A" />
        <stop offset="0.6" stopColor="#2563EB" />
        <stop offset="1" stopColor="#1D4ED8" />
      </linearGradient>
    </defs>
  </svg>
);

/** 6. NỮ CÔNG CHỨC - Áo dài xanh ngọc thanh lịch & hoa cài ngực */
export const FemaleAoDaiCyanSVG: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="100" height="100" rx="20" fill="url(#female_cyan_bg)" />
    <circle cx="50" cy="38" r="32" fill="#99F6E4" opacity="0.25" />
    <path d="M26 38C26 58 28 85 34 95H66C72 85 74 58 74 38C74 20 64 15 50 15C36 15 26 20 26 38Z" fill="#090D16" />
    {/* Áo dài xanh ngọc bích */}
    <path d="M16 100C18 78 28 67 42 66L50 71L58 66C72 67 82 78 84 100H16Z" fill="#0D9488" />
    <path d="M16 100C24 82 34 72 44 68L50 71L56 68C66 72 76 82 84 100H16Z" fill="#0F766E" opacity="0.35" />
    <path d="M42 66C42 59 58 59 58 66L55 68C55 62 45 62 45 68L42 66Z" fill="#0F766E" stroke="#FACC15" strokeWidth="1" />
    <circle cx="66" cy="78" r="3.5" fill="#FEF08A" stroke="#CA8A04" strokeWidth="0.6" />
    <rect x="45" y="51" width="10" height="13" rx="3" fill="#FCD3B6" />
    <path d="M50 22C37 22 33 31 33 42C33 53 39 60 50 60C61 60 67 53 67 42C67 31 63 22 50 22Z" fill="#FCD3B6" />
    <circle cx="31.8" cy="47" r="1.6" fill="#FEF08A" stroke="#CA8A04" strokeWidth="0.5" />
    <circle cx="68.2" cy="47" r="1.6" fill="#FEF08A" stroke="#CA8A04" strokeWidth="0.5" />
    <path d="M33 38C32 26 38 17 50 17C62 17 68 26 67 38C65 30 59 23 50 23C41 23 35 30 33 38Z" fill="#0F172A" />
    <path d="M33 42C31 52 32 68 35 84C36 85 37 84 37 82C35 68 34 54 36 43Z" fill="#0F172A" />
    <ellipse cx="38" cy="46.5" rx="4" ry="2.2" fill="#FDA4AF" opacity="0.45" />
    <ellipse cx="62" cy="46.5" rx="4" ry="2.2" fill="#FDA4AF" opacity="0.45" />
    <path d="M37 36C40 34.5 44 35 46 36.8" stroke="#0F172A" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <path d="M54 36.8C56 35 60 34.5 63 36" stroke="#0F172A" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <ellipse cx="41.5" cy="41.8" rx="2.4" ry="2.6" fill="#0F172A" />
    <circle cx="42.3" cy="41" r="0.8" fill="#FFFFFF" />
    <ellipse cx="58.5" cy="41.8" rx="2.4" ry="2.6" fill="#0F172A" />
    <circle cx="59.3" cy="41" r="0.8" fill="#FFFFFF" />
    <path d="M50 41V47.5L48.8 48.5H51.2" stroke="#EA580C" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6" />
    <path d="M45.5 53.5C48 56 52 56 54.5 53.5" stroke="#E11D48" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <defs>
      <linearGradient id="female_cyan_bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1E3A8A" />
        <stop offset="0.6" stopColor="#0284C7" />
        <stop offset="1" stopColor="#0F766E" />
      </linearGradient>
    </defs>
  </svg>
);

// Danh mục mẫu avatar chuẩn công chức có sẵn cho cán bộ chọn nhanh
export const PRESET_AVATARS = [
  {
    id: 'preset_male_official',
    label: 'Nam - Vest cà vạt đỏ (Chuẩn công vụ)',
    shortLabel: 'Nam Vest Đỏ',
    gender: 'male' as const,
    type: 'svg' as const,
    url: 'preset:male_official',
    component: MaleAvatarSVG,
  },
  {
    id: 'preset_female_official',
    label: 'Nữ - Áo dài đỏ truyền thống (Chuẩn công vụ)',
    shortLabel: 'Nữ Áo Dài Đỏ',
    gender: 'female' as const,
    type: 'svg' as const,
    url: 'preset:female_official',
    component: FemaleAvatarSVG,
  },
  {
    id: 'preset_male_blue_tie',
    label: 'Nam - Vest cà vạt xanh',
    shortLabel: 'Nam Vest Xanh',
    gender: 'male' as const,
    type: 'svg' as const,
    url: 'preset:male_blue_tie',
    component: MaleVestBlueAvatarSVG,
  },
  {
    id: 'preset_female_office_vest',
    label: 'Nữ - Vest công sở hiện đại',
    shortLabel: 'Nữ Vest Công Sở',
    gender: 'female' as const,
    type: 'svg' as const,
    url: 'preset:female_office_vest',
    component: FemaleOfficeVestSVG,
  },
  {
    id: 'preset_male_shirt',
    label: 'Nam - Sơ mi trắng công vụ',
    shortLabel: 'Nam Sơ Mi Trắng',
    gender: 'male' as const,
    type: 'svg' as const,
    url: 'preset:male_shirt',
    component: MaleShirtAvatarSVG,
  },
  {
    id: 'preset_female_aodai_cyan',
    label: 'Nữ - Áo dài ngọc bích',
    shortLabel: 'Nữ Áo Dài Ngọc',
    gender: 'female' as const,
    type: 'svg' as const,
    url: 'preset:female_aodai_cyan',
    component: FemaleAoDaiCyanSVG,
  },
];

/**
 * Kiểm tra các đường link ảnh placeholder cũ từ mẫu thử nghiệm nước ngoài (Unsplash)
 * để tự động chuyển sang avatar chuẩn công chức Nhà nước
 */
export const isLegacyUnsplashDemoAvatar = (url?: string): boolean => {
  if (!url) return false;
  return [
    'photo-1534528741775-53994a69daeb',
    'photo-1507003211169-0a1dd7228f2d',
    'photo-1500648767791-00dcc994a43e',
    'photo-1492562080023-ab3db95bfbce',
    'photo-1522075469751-3a6694fb2f61',
    'photo-1519085360753-af0119f7cbe7',
    'photo-1573496359142-b8d87734a5a2',
    'photo-1472099645785-5658abf4ff4e',
    'photo-1506794778202-cad84cf45f1d',
    'photo-1580489944761-15a19d654956',
  ].some((id) => url.includes(id));
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  name,
  avatar,
  gender,
  size = 'md',
  className = '',
  showGenderBadge = false,
  showStatusIndicator = false,
  isOnline = false,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  const rawAvatar = avatar ?? user?.avatar;
  const effectiveGender = gender ?? user?.gender;
  const effectiveName = name ?? user?.name ?? 'Cán bộ';

  // Lọc bỏ URL mẫu Unsplash demo nếu có, để ưu tiên avatar chuẩn công chức
  const effectiveAvatar = isLegacyUnsplashDemoAvatar(rawAvatar) ? '' : rawAvatar;

  // Size mapping classes
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-xs sm:text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-24 h-24 text-3xl',
  };

  const badgeSizeClasses = {
    xs: 'w-2 h-2 -bottom-0.5 -right-0.5',
    sm: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5',
    md: 'w-3 h-3 -bottom-0.5 -right-0.5',
    lg: 'w-3.5 h-3.5 bottom-0 right-0',
    xl: 'w-4 h-4 bottom-0.5 right-0.5',
    '2xl': 'w-6 h-6 bottom-1 right-1',
  };

  // Xác định giới tính: Nếu khai báo là 'female' hoặc tên có từ 'Thị', ngược lại mặc định 'male'
  const isFemale =
    effectiveGender === 'female' ||
    (effectiveGender !== 'male' && effectiveName.includes('Thị'));

  const renderContent = () => {
    // 1. Kiểm tra nếu là Preset Avatar dạng SVG
    if (effectiveAvatar) {
      if (effectiveAvatar === 'preset:male_official') {
        return <MaleAvatarSVG className="w-full h-full" />;
      }
      if (effectiveAvatar === 'preset:female_official') {
        return <FemaleAvatarSVG className="w-full h-full" />;
      }
      if (effectiveAvatar === 'preset:male_blue_tie') {
        return <MaleVestBlueAvatarSVG className="w-full h-full" />;
      }
      if (effectiveAvatar === 'preset:female_office_vest') {
        return <FemaleOfficeVestSVG className="w-full h-full" />;
      }
      if (effectiveAvatar === 'preset:male_shirt') {
        return <MaleShirtAvatarSVG className="w-full h-full" />;
      }
      if (effectiveAvatar === 'preset:female_aodai_cyan') {
        return <FemaleAoDaiCyanSVG className="w-full h-full" />;
      }
    }

    // 2. Nếu có ảnh cá nhân người dùng tải lên (upload) hoặc đường dẫn hợp lệ
    const hasValidPhoto = Boolean(effectiveAvatar && effectiveAvatar.trim() && !imageError);
    if (hasValidPhoto) {
      return (
        <img
          src={effectiveAvatar}
          alt={effectiveName}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded-inherit"
        />
      );
    }

    // 3. Mặc định theo Giới tính: Nam hoặc Nữ chuẩn công chức Nhà nước
    if (isFemale) {
      return <FemaleAvatarSVG className="w-full h-full" />;
    }

    return <MaleAvatarSVG className="w-full h-full" />;
  };

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 select-none rounded-xl overflow-hidden shadow-2xs ${
        sizeClasses[size]
      } ${onClick ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-transform' : ''} ${className}`}
      title={`${effectiveName} (${isFemale ? 'Cán bộ Nữ' : 'Cán bộ Nam'})`}
    >
      {renderContent()}

      {/* Chấm trạng thái hoạt động trực tuyến */}
      {showStatusIndicator && (
        <span
          className={`absolute rounded-full border-2 border-white dark:border-slate-900 ${
            badgeSizeClasses[size]
          } ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}
          title={isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
        />
      )}

      {/* Huy hiệu ký hiệu giới tính (♂ Nam / ♀ Nữ) */}
      {showGenderBadge && (
        <span
          className={`absolute rounded-full text-[9px] font-bold flex items-center justify-center leading-none text-white shadow-xs ${
            badgeSizeClasses[size]
          } ${isFemale ? 'bg-rose-500' : 'bg-blue-600'}`}
          title={isFemale ? 'Giới tính: Nữ' : 'Giới tính: Nam'}
        >
          {isFemale ? '♀' : '♂'}
        </span>
      )}
    </div>
  );
};
