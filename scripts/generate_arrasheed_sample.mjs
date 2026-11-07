// opentimetable/scripts/generate_arrasheed_sample.mjs
// Generates authentic Ar-Rasheed Smart University (Sanaa) dataset matching official aSc Timetables evidence.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jiti = require('../apps/web/node_modules/jiti/lib/index.js')(import.meta.url);

const { generateDefaultBells } = jiti('../apps/web/src/lib/domain.ts');
const { serializeRozBinary } = jiti('../apps/web/src/lib/roz-serializer.ts');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const opentimetableRoot = path.resolve(__dirname, '..');
const demosDir = path.resolve(opentimetableRoot, 'apps/web/public/demos');

if (!fs.existsSync(demosDir)) {
  fs.mkdirSync(demosDir, { recursive: true });
}

// 1. Basic Metadata
const schoolName = 'جامعة الرشيد الذكية - صنعاء';
const academicYear = '2025/2026';
const cycleDays = 6; // Saturday to Thursday
const periodsPerDay = 18; // 30-min contiguous university intervals
const bellSchedule = generateDefaultBells(18, 30, 0);

// 2. Class Groups (Faculties & Sections from Authentic University Evidence)
const classes = [
  { id: 'C_CYS_L2_G1', name: 'CyberSecuirtyLevel2-G1', short: 'CYS-L2-G1', nameAr: 'الأمن السيبراني - المستوى 2 - قاعة 1', grade: '2', color: '#0284c7' },
  { id: 'C_AI_L2_G1', name: 'Artificial Intelligence-L2-G1', short: 'AI-L2-G1', nameAr: 'الذكاء الاصطناعي - المستوى 2 - قاعة 1', grade: '2', color: '#7c3aed' },
  { id: 'C_DENT_L2', name: 'Denstistry-L2', short: 'Dent-L2', nameAr: 'طب وجراحة الفم والأسنان - المستوى 2', grade: '2', color: '#0891b2' },
  { id: 'C_GMM_L2_G1A', name: 'Graphics and Multimedia-L2- G1-A', short: 'GMM-L2-G1A', nameAr: 'الجرافيك والوسائط - المستوى 2 - م1-أ', grade: '2', color: '#db2777' },
  { id: 'C_LAB_L2', name: 'Laboratory -L2', short: 'Lab-L2', nameAr: 'المختبرات الطبية - المستوى 2', grade: '2', color: '#059669' },
];

// 3. Teachers (Official Faculty & Teaching Assistants from Evidence)
const teachers = [
  { id: 'T_SENAN', name: 'Senan Ghlab , Dr.', nameAr: 'د. سنان غلاب', speciality: 'Data Science', color: '#2563eb' },
  { id: 'T_ANWAR', name: 'Anwar Al-Thari Dr.', nameAr: 'د. أنور الظاهري', speciality: 'Algorithms', color: '#4f46e5' },
  { id: 'T_GOFI', name: 'Ahmed Al-Gofi Dr.', nameAr: 'د. أحمد الجوفي', speciality: 'Medical Bacteriology', color: '#16a34a' },
  { id: 'T_MEKHLAFI', name: 'Abdul-salam Al-mekhlafi Dr.', nameAr: 'د. عبد السلام المخلافي', speciality: 'Parasitology', color: '#ca8a04' },
  { id: 'T_HADAD', name: 'Dr.Ibrahim Al-Hadad', nameAr: 'د. إبراهيم الحداد', speciality: 'Database & OS', color: '#dc2626' },
  { id: 'T_FAIROZ', name: 'Dr. Fairoz', nameAr: 'د. فيروز', speciality: 'Biochemistry', color: '#9333ea' },
  { id: 'T_RUMIMA', name: 'Asmaa Al-Rumima Dr.', nameAr: 'د. أسماء الرميمة', speciality: 'Operative Dentistry', color: '#e11d48' },
  { id: 'T_SAM', name: 'Sam Abdulkareem Dr.', nameAr: 'د. سام عبد الكريم', speciality: 'Oral Surgery', color: '#ea580c' },
  { id: 'T_ZARIKA', name: 'Abeer Al-Zarika D', nameAr: 'د. عبير الزريقي', speciality: 'Microbiology & Immunity', color: '#0284c7' },
  { id: 'T_ZAID', name: 'Ahmed Zaid Dr.', nameAr: 'د. أحمد زيد', speciality: 'General Surgery', color: '#059669' },
  { id: 'T_JAMEEL', name: 'Jameel Dr.', nameAr: 'د. جميل', speciality: 'Cybersecurity Risk', color: '#b91c1c' },
  { id: 'T_SHAIMA', name: 'Shaima Al-harazi eng', nameAr: 'م. شيماء الحرازي', speciality: 'Networks Lab', color: '#0d9488' },
  { id: 'T_OSAMA', name: 'Osama Al-kabudi', nameAr: 'م. أسامة الكبودي', speciality: 'Machine Learning Lab', color: '#6366f1' },
  { id: 'T_QUSAI', name: 'Qusai Almansoor', nameAr: 'م. قصي المنصور', speciality: 'Web Dev Tut', color: '#d97706' },
  { id: 'T_RAGHAD', name: 'Raghad Eng.', nameAr: 'م. رغد', speciality: 'Database Security Lab', color: '#c026d3' },
  { id: 'T_ROAA', name: "Roa'a Salem", nameAr: 'م. رؤى سالم', speciality: 'OS Lab', color: '#475569' },
  { id: 'T_ASEEL', name: 'Aseel Al-Qubati', nameAr: 'م. أسيل القبطي', speciality: 'Cryptography Lab', color: '#e11d48' },
  { id: 'T_YASSER', name: 'Yasser Alkhateeb T.', nameAr: 'أ. ياسر الخطيب', speciality: '3D & Visual Identity', color: '#0891b2' },
  { id: 'T_BODOUR', name: 'Bodour Eng.', nameAr: 'م. بدور', speciality: 'Web Design Lab', color: '#f59e0b' },
  { id: 'T_AFRA', name: 'Afra Al-Sharghbi', nameAr: 'أ. عفراء الشرجبي', speciality: '2D Animation', color: '#ec4899' },
  { id: 'T_ARWA', name: 'Arwa Al-Shargab, T.', nameAr: 'أ. أروى الشرجبي', speciality: 'Web Technologies', color: '#84cc16' },
  { id: 'T_RIASHI', name: 'Saleh Al-Riashi T.', nameAr: 'أ. صالح الرياشي', speciality: 'Switching & Routing', color: '#3b82f6' },
  { id: 'T_HOFAFI', name: 'Abdulalalh Al-hofafi', nameAr: 'أ. عبد الإله الحفافي', speciality: 'Cryptography', color: '#64748b' },
  { id: 'T_SAMI', name: 'Sami', nameAr: 'أ. سامي', speciality: 'Networks', color: '#10b981' },
  { id: 'T_BELAL', name: 'Belal', nameAr: 'أ. بلال', speciality: 'Machine Learning', color: '#8b5cf6' },
  { id: 'T_BOSHRA', name: 'Boshra Al Absi', nameAr: 'أ. بشرى العبسي', speciality: 'Hematology', color: '#f43f5e' },
  { id: 'T_YOSRA', name: 'Yosra Al- Malhani', nameAr: 'أ. يسرى الملحاني', speciality: 'Hematology Lab', color: '#14b8a6' },
  { id: 'T_THURIA', name: 'Thuria Hany', nameAr: 'أ. ثريا هاني', speciality: 'Biochemistry Lab', color: '#a855f7' },
  { id: 'T_WALEED', name: 'Waleed Almuraisi', nameAr: 'أ. وليد المريسي', speciality: 'Parasitology Lab', color: '#f97316' },
  { id: 'T_AHLAM', name: 'Ahlam Alhababi', nameAr: 'أ. أحلام الحبابي', speciality: 'Oral Pathology Lab', color: '#06b6d4' },
  { id: 'T_RADFAN', name: 'Radfan Al-abdi', nameAr: 'أ. ردفان العبدي', speciality: 'Head & Neck Lab', color: '#8b5cf6' },
  { id: 'T_ELHAM', name: 'Elham Qeshashah', nameAr: 'أ. إلهام قشاشة', speciality: 'Digital Typography', color: '#ec4899' },
  { id: 'T_YOUSIEF', name: 'Yousief Mojali', nameAr: 'أ. يوسف مجلي', speciality: 'Audio & Video', color: '#3b82f6' },
  { id: 'T_RAFEQ', name: 'Zaid Al-Rafeq', nameAr: 'أ. زيد الرافق', speciality: 'Culture 2', color: '#10b981' },
];

// 4. Classrooms & Specialized University Laboratories
const rooms = [
  // Lecture Halls
  { id: 'R_D401', name: 'D401 (50)', capacity: 50, building: 'Building D' },
  { id: 'R_D402', name: 'D402 (70)', capacity: 70, building: 'Building D' },
  { id: 'R_D404', name: 'D404 (50)', capacity: 50, building: 'Building D' },
  { id: 'R_D405', name: 'D405 (70)', capacity: 70, building: 'Building D' },
  { id: 'R_D406', name: 'D406 (60)', capacity: 60, building: 'Building D' },
  { id: 'R_D407', name: 'D407 (70)', capacity: 70, building: 'Building D' },
  { id: 'R_D408', name: 'D408 (70)', capacity: 70, building: 'Building D' },
  { id: 'R_D102', name: 'D102 (70)', capacity: 70, building: 'Building D' },
  { id: 'R_B401', name: 'B401', capacity: 40, building: 'Building B' },
  { id: 'R_B404', name: 'B404', capacity: 40, building: 'Building B' },
  { id: 'R_B410', name: 'B410', capacity: 35, building: 'Building B' },
  { id: 'R_B411', name: 'B411', capacity: 35, building: 'Building B' },
  { id: 'R_B412', name: 'B412', capacity: 35, building: 'Building B' },
  { id: 'R_B103', name: 'B103', capacity: 30, building: 'Building B' },
  { id: 'R_B105', name: 'B105', capacity: 30, building: 'Building B' },
  { id: 'R_B108', name: 'B108', capacity: 30, building: 'Building B' },
  { id: 'R_B109', name: 'B109', capacity: 45, building: 'Building B' },

  // Specialized Computer & Engineering Labs
  { id: 'R_C_LAB_D403', name: 'C-Lab-D403', capacity: 35, building: 'Building D' },
  { id: 'R_C_LAB_D503', name: 'C-Lab-D503', capacity: 35, building: 'Building D' },
  { id: 'R_C_LAB_103', name: 'C-Lab-103', capacity: 30, building: 'Building C' },
  { id: 'R_CLAB_C202', name: 'CLab-C202', capacity: 30, building: 'Building C' },
  { id: 'R_CLAB_A105', name: 'CLab-A105', capacity: 30, building: 'Building A' },
  { id: 'R_CYSLAB3_A302', name: 'CYSLab3-A302', capacity: 30, building: 'Building A' },
  { id: 'R_GMMLAB_A202', name: 'GMMLab-A202', capacity: 30, building: 'Building A' },
  { id: 'R_PHOTO_STUDIO', name: 'Photo. Studio', capacity: 25, building: 'Building A' },
  { id: 'R_DLAB001', name: 'DLab001', capacity: 30, building: 'Building D' },
  { id: 'R_DLAB003', name: 'DLab003', capacity: 30, building: 'Building D' },

  // Medical & Dental Labs
  { id: 'R_BIOCHEM_B303', name: 'BioChem-Lab-B303', capacity: 30, building: 'Building B' },
  { id: 'R_PHANTOM_LAB', name: 'Phantom Lab', capacity: 30, building: 'Medical Center' },
  { id: 'R_DENTAL_MAT_LAB', name: 'Dental Material Lab', capacity: 30, building: 'Medical Center' },
];

// 5. University Courses / Subjects
const subjects = [
  // Cybersecurity & Computing
  { id: 'S_CRYPTO', name: 'Cryptography', short: 'Crypto', nameAr: 'علم التشفير', color: '#0284c7' },
  { id: 'S_CRYPTO_LAB', name: 'Cryptography_lab', short: 'CryptoLab', nameAr: 'معمل التشفير', color: '#38bdf8' },
  { id: 'S_CYS_RISK', name: 'Cybersecurity Risk Managment', short: 'CYSRisk', nameAr: 'إدارة مخاطر الأمن السيبراني', color: '#e11d48' },
  { id: 'S_CYS_RISK_LAB', name: 'Cybersecurity Risk Managment lab', short: 'CYSRiskLab', nameAr: 'معمل إدارة مخاطر الأمن السيبراني', color: '#fb7185' },
  { id: 'S_DB_SEC', name: 'Database Management and Security', short: 'DBSec', nameAr: 'أمن وإدارة قواعد البيانات', color: '#7c3aed' },
  { id: 'S_DB_SEC_LAB', name: 'Database Management and SecurityL', short: 'DBSecLab', nameAr: 'معمل أمن قواعد البيانات', color: '#a78bfa' },
  { id: 'S_NET_ROUTING', name: 'Networks Switching and Routing', short: 'NetRoute', nameAr: 'توجيه وتبديل الشبكات', color: '#059669' },
  { id: 'S_NET_ROUTING_LAB', name: 'Networks Switching and Routing_lab', short: 'NetRouteLab', nameAr: 'معمل توجيه وتبديل الشبكات', color: '#34d399' },
  { id: 'S_OS', name: 'Operating Systems', short: 'OS', nameAr: 'أنظمة التشغيل', color: '#475569' },
  { id: 'S_OS_LAB', name: 'Operating System-Lab', short: 'OSLab', nameAr: 'معمل أنظمة التشغيل', color: '#94a3b8' },
  { id: 'S_WEB_TECH', name: 'Web Technologies', short: 'WebTech', nameAr: 'تقنيات الويب المتقدمة', color: '#d97706' },

  // Artificial Intelligence
  { id: 'S_ML', name: 'Machine Learning', short: 'ML', nameAr: 'تعلم الآلة', color: '#8b5cf6' },
  { id: 'S_ML_LAB', name: 'Machine Learning lab', short: 'MLLab', nameAr: 'معمل تعلم الآلة', color: '#c4b5fd' },
  { id: 'S_DATA_SCI', name: 'Introduction to Data Science', short: 'DataSci', nameAr: 'مقدمة في علم البيانات', color: '#2563eb' },
  { id: 'S_ALGO', name: 'Design and Analysis of Algorithms', short: 'Algo', nameAr: 'تصميم وتحليل الخوارزميات', color: '#4f46e5' },
  { id: 'S_MOBILE_DEV', name: 'Mobile Application Development', short: 'MobileDev', nameAr: 'تطوير تطبيقات الأجهزة الذكية', color: '#06b6d4' },
  { id: 'S_WEB_DEV_TUT', name: 'Web Design and Development-Tut', short: 'WebDevTut', nameAr: 'تمارين تصميم وتطوير الويب', color: '#f59e0b' },
  { id: 'S_NETWORKS', name: 'Computer Networks', short: 'Networks', nameAr: 'شبكات الحاسوب', color: '#10b981' },
  { id: 'S_NETWORKS_LAB', name: 'Computer Networks lab', short: 'NetLab', nameAr: 'معمل شبكات الحاسوب', color: '#6ee7b7' },

  // Dentistry
  { id: 'S_ORAL_SURG', name: 'Oral Surgery', short: 'OralSurg', nameAr: 'جراحة الفم والأسنان', color: '#ea580c' },
  { id: 'S_GEN_SURG', name: 'General Surgery', short: 'GenSurg', nameAr: 'الجراحة العامة', color: '#059669' },
  { id: 'S_OPERATIVE', name: 'Introduction to Operative', short: 'Operative', nameAr: 'مقدمة في المداواة السنية', color: '#e11d48' },
  { id: 'S_DENT_MAT_LAB', name: 'Dental Material Lab', short: 'DentMatLab', nameAr: 'معمل مواد طب الأسنان', color: '#0284c7' },
  { id: 'S_MICRO_IMMUN_LAB', name: 'Microbiology and Immunity 2 lab', short: 'MicroLab', nameAr: 'معمل الأحياء الدقيقة والمناعة', color: '#14b8a6' },
  { id: 'S_HEAD_NECK_LAB', name: 'Head&Neck Lab', short: 'HeadNeckLab', nameAr: 'تشريح الرأس والعنق', color: '#9333ea' },
  { id: 'S_ORAL_PATH_LAB', name: 'Oral Pathology Lab', short: 'OralPathLab', nameAr: 'معمل أمراض الفم', color: '#db2777' },

  // Graphics & Multimedia
  { id: 'S_DIGITAL_TYPO', name: 'Digital Typography', short: 'DigiTypo', nameAr: 'التايبوغرافي الرقمي', color: '#ec4899' },
  { id: 'S_3D_DESIGN', name: '3D Design', short: '3DDesign', nameAr: 'التصميم ثلاثي الأبعاد', color: '#0891b2' },
  { id: 'S_AUDIO_VIDEO', name: 'Digital Audio and Video Production', short: 'AudioVideo', nameAr: 'إنتاج الصوت والفيديو الرقمي', color: '#3b82f6' },
  { id: 'S_GMM_WEB', name: 'Web Design', short: 'GMMWeb', nameAr: 'تصميم مواقع الويب', color: '#f59e0b' },
  { id: 'S_2D_ANIM', name: '2D Animation', short: '2DAnim', nameAr: 'الرسوم المتحركة ثنائية الأبعاد', color: '#f43f5e' },
  { id: 'S_VISUAL_ID', name: 'Visual Identity', short: 'VisualId', nameAr: 'الهوية البصرية والعلامات التجارية', color: '#10b981' },

  // Medical Laboratory
  { id: 'S_HEMATO_2', name: 'Hematology 2', short: 'Hemato2', nameAr: 'أمراض الدم 2', color: '#f43f5e' },
  { id: 'S_HEMATO_2_LAB', name: 'Hematology 2-Lab', short: 'HematoLab', nameAr: 'معمل أمراض الدم 2', color: '#fb7185' },
  { id: 'S_MED_BACT', name: 'Medical Bacteriology', short: 'MedBact', nameAr: 'البكتيريا الطبية', color: '#16a34a' },
  { id: 'S_MED_BACT_LAB', name: 'Medical Bacteriology 1 Lab', short: 'MedBactLab', nameAr: 'معمل البكتيريا الطبية', color: '#4ade80' },
  { id: 'S_IMMUN', name: 'Basics of Immunology', short: 'Immun', nameAr: 'أساسيات علم المناعة', color: '#0284c7' },
  { id: 'S_IMMUN_LAB', name: 'Basic of Immunology Lab', short: 'ImmunLab', nameAr: 'معمل أساسيات علم المناعة', color: '#38bdf8' },
  { id: 'S_PARASIT', name: 'Medical Parasitology 2', short: 'Parasit', nameAr: 'الطفيليات الطبية 2', color: '#ca8a04' },
  { id: 'S_PARASIT_LAB', name: 'Medical Parasitology 2 Lab', short: 'ParasitLab', nameAr: 'معمل الطفيليات الطبية 2', color: '#facc15' },
  { id: 'S_BIOCHEM_2', name: 'Biochemistry-2', short: 'BioChem2', nameAr: 'الكيمياء الحيوية 2', color: '#9333ea' },
  { id: 'S_BIOCHEM_2_LAB', name: 'Biochemistry-2-Lab', short: 'BioChemLab', nameAr: 'معمل الكيمياء الحيوية 2', color: '#c084fc' },

  // General University Requirement
  { id: 'S_CULTURE_2', name: 'Culture 2', short: 'Culture2', nameAr: 'الثقافة الوطنية 2', color: '#10b981' },
];

// Helper to define lesson and placement
let lessonIdCounter = 1;
const lessons = [];
const placements = [];

function addLecture(classId, subjectId, teacherId, roomId, dayIndex, periodIndex, duration = 4, group = undefined) {
  const lId = `L_${lessonIdCounter++}`;
  const lesson = {
    id: lId,
    classId,
    subjectId,
    teacherId,
    roomId,
    duration,
    periodsPerWeek: duration,
    group,
  };
  lessons.push(lesson);

  const placement = {
    lessonId: lId,
    dayIndex,
    periodIndex,
    roomId,
    duration,
    isLocked: true,
  };
  placements.push(placement);
}

// ==============================================================================
// 6. Placements for CyberSecuirtyLevel2-G1 (Exact match with uploaded PDF)
// ==============================================================================
// Sunday (Day 1)
addLecture('C_CYS_L2_G1', 'S_CRYPTO', 'T_HOFAFI', 'R_D406', 1, 8, 4);
addLecture('C_CYS_L2_G1', 'S_CYS_RISK', 'T_JAMEEL', 'R_D406', 1, 12, 4);

// Monday (Day 2) - Multi-Group Split Sessions
addLecture('C_CYS_L2_G1', 'S_DB_SEC_LAB', 'T_RAGHAD', 'R_DLAB003', 2, 0, 4, 'Group(A)');
addLecture('C_CYS_L2_G1', 'S_WEB_TECH', 'T_ARWA', 'R_CLAB_A105', 2, 0, 4, 'Group(B)');

addLecture('C_CYS_L2_G1', 'S_WEB_TECH', 'T_ARWA', 'R_CLAB_A105', 2, 6, 4, 'Group(A)');
addLecture('C_CYS_L2_G1', 'S_DB_SEC_LAB', 'T_RAGHAD', 'R_DLAB003', 2, 6, 4, 'Group(B)');

addLecture('C_CYS_L2_G1', 'S_CRYPTO_LAB', 'T_ASEEL', 'R_CLAB_C202', 2, 12, 4, 'Group(A)');

// Tuesday (Day 3)
addLecture('C_CYS_L2_G1', 'S_NET_ROUTING', 'T_SAMI', 'R_D408', 3, 0, 4);
addLecture('C_CYS_L2_G1', 'S_OS', 'T_RIASHI', 'R_D408', 3, 4, 4);
addLecture('C_CYS_L2_G1', 'S_CULTURE_2', 'T_RAFEQ', 'R_D405', 3, 8, 4);

// Wednesday (Day 4)
addLecture('C_CYS_L2_G1', 'S_NET_ROUTING_LAB', 'T_SHAIMA', 'R_CLAB_A105', 4, 0, 4, 'Group(B)');
addLecture('C_CYS_L2_G1', 'S_DB_SEC', 'T_HADAD', 'R_D406', 4, 4, 4);
addLecture('C_CYS_L2_G1', 'S_NET_ROUTING_LAB', 'T_SHAIMA', 'R_CLAB_A105', 4, 8, 4, 'Group(A)');
addLecture('C_CYS_L2_G1', 'S_CYS_RISK_LAB', 'T_ASEEL', 'R_C_LAB_D403', 4, 8, 4, 'Group(B)');

// Thursday (Day 5)
addLecture('C_CYS_L2_G1', 'S_OS_LAB', 'T_ROAA', 'R_DLAB001', 5, 0, 4, 'Group(A)');
addLecture('C_CYS_L2_G1', 'S_CRYPTO_LAB', 'T_ASEEL', 'R_C_LAB_D403', 5, 0, 4, 'Group(B)');
addLecture('C_CYS_L2_G1', 'S_CYS_RISK_LAB', 'T_ASEEL', 'R_C_LAB_D403', 5, 4, 4, 'Group(A)');
addLecture('C_CYS_L2_G1', 'S_OS_LAB', 'T_ROAA', 'R_DLAB003', 5, 4, 4, 'Group(B)');

// ==============================================================================
// 7. Placements for Artificial Intelligence-L2-G1
// ==============================================================================
// Saturday (Day 0)
addLecture('C_AI_L2_G1', 'S_MOBILE_DEV', 'T_OSAMA', 'R_C_LAB_D503', 0, 0, 4, 'Group(A)');
addLecture('C_AI_L2_G1', 'S_WEB_DEV_TUT', 'T_QUSAI', 'R_C_LAB_103', 0, 0, 4, 'Group(B)');

// Sunday (Day 1)
addLecture('C_AI_L2_G1', 'S_NETWORKS', 'T_SAMI', 'R_D404', 1, 0, 4);
addLecture('C_AI_L2_G1', 'S_DATA_SCI', 'T_SENAN', 'R_D102', 1, 4, 4);
addLecture('C_AI_L2_G1', 'S_DATA_SCI', 'T_SENAN', 'R_D404', 1, 8, 2);

// Monday (Day 2)
addLecture('C_AI_L2_G1', 'S_ML', 'T_BELAL', 'R_D402', 2, 0, 4);
addLecture('C_AI_L2_G1', 'S_ALGO', 'T_ANWAR', 'R_D406', 2, 4, 4);
addLecture('C_AI_L2_G1', 'S_CULTURE_2', 'T_RAFEQ', 'R_D405', 2, 8, 4);
addLecture('C_AI_L2_G1', 'S_ML_LAB', 'T_OSAMA', 'R_C_LAB_D503', 2, 14, 4, 'Group(A)');

// Tuesday (Day 3)
addLecture('C_AI_L2_G1', 'S_ALGO', 'T_ANWAR', 'R_D408', 3, 4, 4);
addLecture('C_AI_L2_G1', 'S_ML_LAB', 'T_OSAMA', 'R_C_LAB_D503', 3, 10, 4, 'Group(B)');

// Wednesday (Day 4)
addLecture('C_AI_L2_G1', 'S_WEB_DEV_TUT', 'T_QUSAI', 'R_C_LAB_D503', 4, 0, 4, 'Group(A)');
addLecture('C_AI_L2_G1', 'S_NETWORKS_LAB', 'T_SHAIMA', 'R_C_LAB_103', 4, 12, 4, 'Group(A)');

// Thursday (Day 5)
addLecture('C_AI_L2_G1', 'S_MOBILE_DEV', 'T_OSAMA', 'R_C_LAB_D503', 5, 4, 4);
addLecture('C_AI_L2_G1', 'S_NETWORKS_LAB', 'T_SHAIMA', 'R_C_LAB_103', 5, 14, 4, 'Group(B)');

// ==============================================================================
// 8. Placements for Denstistry-L2
// ==============================================================================
addLecture('C_DENT_L2', 'S_ORAL_SURG', 'T_SAM', 'R_B401', 1, 4, 4);
addLecture('C_DENT_L2', 'S_GEN_SURG', 'T_ZAID', 'R_B401', 2, 0, 4);

// Wednesday - Group divisions GA, GB
addLecture('C_DENT_L2', 'S_DENT_MAT_LAB', 'T_RUMIMA', 'R_B410', 4, 0, 4, 'GA');
addLecture('C_DENT_L2', 'S_MICRO_IMMUN_LAB', 'T_ZARIKA', 'R_B401', 4, 0, 4, 'GB');
addLecture('C_DENT_L2', 'S_MICRO_IMMUN_LAB', 'T_ZARIKA', 'R_B401', 4, 4, 4, 'GA');
addLecture('C_DENT_L2', 'S_DENT_MAT_LAB', 'T_RUMIMA', 'R_B410', 4, 4, 4, 'GB');

// Thursday
addLecture('C_DENT_L2', 'S_OPERATIVE', 'T_RUMIMA', 'R_B412', 5, 0, 4);
addLecture('C_DENT_L2', 'S_HEAD_NECK_LAB', 'T_RADFAN', 'R_B401', 5, 6, 4, 'Group 1');
addLecture('C_DENT_L2', 'S_ORAL_PATH_LAB', 'T_AHLAM', 'R_B412', 5, 6, 4, 'Group 2');
addLecture('C_DENT_L2', 'S_ORAL_PATH_LAB', 'T_AHLAM', 'R_B412', 5, 10, 4, 'Group 1');
addLecture('C_DENT_L2', 'S_HEAD_NECK_LAB', 'T_RADFAN', 'R_B401', 5, 10, 4, 'Group 2');

// ==============================================================================
// 9. Placements for Graphics and Multimedia-L2- G1-A
// ==============================================================================
addLecture('C_GMM_L2_G1A', 'S_DIGITAL_TYPO', 'T_ELHAM', 'R_CLAB_C202', 0, 0, 4);
addLecture('C_GMM_L2_G1A', 'S_3D_DESIGN', 'T_YASSER', 'R_GMMLAB_A202', 0, 10, 4);
addLecture('C_GMM_L2_G1A', 'S_AUDIO_VIDEO', 'T_YOUSIEF', 'R_C_LAB_D503', 1, 0, 4);
addLecture('C_GMM_L2_G1A', 'S_GMM_WEB', 'T_BODOUR', 'R_CYSLAB3_A302', 2, 6, 4);
addLecture('C_GMM_L2_G1A', 'S_2D_ANIM', 'T_AFRA', 'R_CYSLAB3_A302', 2, 10, 4);
addLecture('C_GMM_L2_G1A', 'S_VISUAL_ID', 'T_YASSER', 'R_GMMLAB_A202', 4, 0, 4);

// ==============================================================================
// 10. Placements for Laboratory -L2
// ==============================================================================
addLecture('C_LAB_L2', 'S_HEMATO_2', 'T_BOSHRA', 'R_B109', 1, 4, 4);
addLecture('C_LAB_L2', 'S_MED_BACT_LAB', 'T_ZARIKA', 'R_B109', 1, 8, 2);
addLecture('C_LAB_L2', 'S_HEMATO_2_LAB', 'T_YOSRA', 'R_B404', 2, 0, 4);
addLecture('C_LAB_L2', 'S_IMMUN', 'T_GOFI', 'R_B109', 2, 4, 4);
addLecture('C_LAB_L2', 'S_IMMUN_LAB', 'T_ZARIKA', 'R_B109', 2, 8, 2);
addLecture('C_LAB_L2', 'S_CULTURE_2', 'T_RAFEQ', 'R_B404', 3, 0, 4);
addLecture('C_LAB_L2', 'S_PARASIT_LAB', 'T_WALEED', 'R_B109', 3, 4, 4);
addLecture('C_LAB_L2', 'S_PARASIT', 'T_MEKHLAFI', 'R_B109', 4, 0, 4);
addLecture('C_LAB_L2', 'S_BIOCHEM_2', 'T_FAIROZ', 'R_B109', 4, 4, 4);
addLecture('C_LAB_L2', 'S_MED_BACT', 'T_GOFI', 'R_B109', 5, 0, 4);
addLecture('C_LAB_L2', 'S_BIOCHEM_2_LAB', 'T_THURIA', 'R_BIOCHEM_B303', 5, 4, 4);

// Assemble complete project JSON
const projectJson = {
  schoolName,
  academicYear,
  cycleDays,
  periodsPerDay,
  bellSchedule,
  teachers,
  classes,
  rooms,
  subjects,
  lessons,
  placements,
  timeOffMatrix: {},
  schemaVersion: 314,
};

// Write JSON file
const jsonPath = path.join(demosDir, 'Ar_Rasheed_Smart_University.json');
fs.writeFileSync(jsonPath, JSON.stringify(projectJson, null, 2), 'utf-8');
console.log(`[OK] Wrote Ar-Rasheed JSON dataset to: ${jsonPath}`);
console.log(`     Total classes: ${classes.length}`);
console.log(`     Total teachers: ${teachers.length}`);
console.log(`     Total rooms: ${rooms.length}`);
console.log(`     Total subjects: ${subjects.length}`);
console.log(`     Total lessons: ${lessons.length}`);
console.log(`     Total placements: ${placements.length}`);

// Generate Binary .roz file
try {
  const rozBytes = serializeRozBinary(projectJson, { schemaVersion: 314, targetEncoding: 'utf8' });
  const rozPath = path.join(demosDir, 'Ar_Rasheed_Smart_University.roz');
  fs.writeFileSync(rozPath, Buffer.from(rozBytes));
  console.log(`[OK] Wrote Ar-Rasheed .roz binary container to: ${rozPath} (${rozBytes.length} bytes)`);
} catch (err) {
  console.error('[FAIL] Failed generating .roz binary:', err);
}
