import { Project, WorkspaceFile, ProjectTemplate, StoragePlan, StorageQuota } from '../types';

export const INITIAL_STORAGE_PLANS: StoragePlan[] = [
  {
    id: 'free',
    nameAr: 'الخطة المجانية (Free)',
    nameEn: 'Free Tier',
    storageGb: 1,
    maxProjects: 3,
    price: '$0 / شهر',
    features: ['1 GB مساحة تخزين', '3 مشاريع نشطة', 'استضافة فرعية مجانية', 'مساعد الذكاء الاصطناعي الأساسي'],
  },
  {
    id: 'developer',
    nameAr: 'المطور (Developer)',
    nameEn: 'Developer Plan',
    storageGb: 10,
    maxProjects: 20,
    price: '$9 / شهر',
    features: ['10 GB مساحة تخزين فائقة السرعة', '20 مشروع نشط', 'ربط بوت تلغرام مخصص', 'استضافة مع نطاقات مخصصة (Custom Domains)', 'فك ضغط ZIP فوري غير محدود'],
  },
  {
    id: 'pro',
    nameAr: 'المحترف (Pro)',
    nameEn: 'Pro Plan',
    storageGb: 50,
    maxProjects: 'unlimited',
    price: '$24 / شهر',
    features: ['50 GB سعة تخزينية', 'مشاريع غير محدودة', 'AI Agent ذكي لبناء ونشر المواقع', 'نسخ احتياطي يومي تلقائي', 'حماية وعزل Sandbox متقدم'],
  },
  {
    id: 'business',
    nameAr: 'الأعمال (Business)',
    nameEn: 'Enterprise',
    storageGb: 200,
    maxProjects: 'unlimited',
    price: '$79 / شهر',
    features: ['200+ GB تخزين مؤسسي', 'سيرفرات مخصصة فائقة الأداء', 'دعم فني على مدار الساعة', 'أدوات أمان وتحليل الملفات المتقدمة'],
  },
];

export const INITIAL_STORAGE_QUOTA: StorageQuota = {
  usedBytes: 4.2 * 1024 * 1024 * 1024, // 4.2 GB
  totalBytes: 10 * 1024 * 1024 * 1024, // 10 GB
  byCategory: {
    projects: 2.1 * 1024 * 1024 * 1024, // 2.1 GB
    documents: 800 * 1024 * 1024, // 800 MB
    images: 900 * 1024 * 1024, // 900 MB
    backups: 400 * 1024 * 1024, // 400 MB
  },
  plan: 'developer',
};

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-university',
    name: 'بوابة جامعة النيلين الذكية',
    slug: 'university-portal',
    description: 'موقع جامعة سودانية متكامل يضم بوابة للطلاب، تسجيل الدخول، الأخبار الأكاديمية، الكليات ولوحة تحكم الطالب.',
    type: 'html-css-js',
    status: 'deployed',
    deployedUrl: 'https://university-sd.buildbox.app',
    customDomain: 'portal.neelain.edu.sd',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-08T07:30:00Z',
    sizeBytes: 3.4 * 1024 * 1024,
    tags: ['جامعة', 'تعليم', 'طلاب', 'بوابة'],
    versionHistory: [
      { id: 'v1', version: '1.0.0', description: 'النسخة الأولى من الموقع الأساسي', timestamp: '2026-09-01', fileCount: 4 },
      { id: 'v2', version: '1.1.0', description: 'إضافة صفحة تسجيل الدخول ولوحة تحكم المقررات بالـ AI', timestamp: '2026-09-05', fileCount: 6 },
    ],
    files: [
      {
        id: 'f1',
        path: 'index.html',
        name: 'index.html',
        type: 'html',
        sizeBytes: 4200,
        updatedAt: '2026-09-08T07:15:00Z',
        content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>جامعة النيلين — البوابة الأكاديمية الذكية</title>
  <link rel="stylesheet" href="css/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
  <!-- شريط التنقل العلوي -->
  <header class="navbar">
    <div class="container nav-content">
      <div class="brand">
        <span class="logo-icon">🏛️</span>
        <div>
          <h1>جامعة النيلين</h1>
          <p class="tagline">الريادة في التعليم العالي والبحث العلمي</p>
        </div>
      </div>
      <nav class="nav-links">
        <a href="index.html" class="active">الرئيسية</a>
        <a href="#colleges">الكليات والأقسام</a>
        <a href="#news">الأخبار والفعاليات</a>
        <a href="#about">عن الجامعة</a>
        <a href="login.html" class="btn-login">تسجيل دخول الطلاب 🎓</a>
      </nav>
    </div>
  </header>

  <!-- القسم الترحيبي -->
  <section class="hero">
    <div class="container hero-grid">
      <div class="hero-text">
        <span class="badge">عام دراسي جديد 2026 / 2027</span>
        <h2>مرحباً بكم في منصة جامعة النيلين الرقمية</h2>
        <p>بيئة تعليمية حديثة توفر للطلاب وأعضاء هيئة التدريس تجربة أكاديمية سلسة تشمل التسجيل الإلكتروني، جداول المحاضرات، ومتابعة النتائج.</p>
        <div class="hero-actions">
          <a href="login.html" class="btn-primary">الدخول لبوابة الطالب</a>
          <a href="#colleges" class="btn-secondary">استكشف الكليات (16 كلية)</a>
        </div>
        <div class="stats-row">
          <div class="stat-card"><strong>45,000+</strong><span>طالب وطالبة</span></div>
          <div class="stat-card"><strong>16</strong><span>كلية متخصصة</span></div>
          <div class="stat-card"><strong>98%</strong><span>نسبة التحول الرقمي</span></div>
        </div>
      </div>
      <div class="hero-card">
        <div class="quick-notice">
          <h3>📌 إعلانات هامة وعاجلة</h3>
          <ul>
            <li>بدء التسجيل الإلكتروني للفصل الدراسي الخريف عبر البوابة.</li>
            <li>إعلان نتائج الامتحانات التكميلية لكلية الهندسة والحاسوب.</li>
            <li>ورشة عمل الذكاء الاصطناعي والبحث العلمي الأحد القادم.</li>
          </ul>
          <a href="dashboard.html" class="btn-preview-dash">معاينة لوحة تحكم الطالب ←</a>
        </div>
      </div>
    </div>
  </section>

  <!-- الكليات والأقسام -->
  <section id="colleges" class="section">
    <div class="container">
      <div class="section-header">
        <h2>الكليات والمراكز الأكاديمية</h2>
        <p>تضم الجامعة نخبة من الكليات العلمية والإنسانية</p>
      </div>
      <div class="colleges-grid">
        <div class="card">
          <div class="card-icon">💻</div>
          <h3>كلية علوم الحاسوب وتقانة المعلومات</h3>
          <p>هندسة البرمجيات، الذكاء الاصطناعي، الأمن السيبراني ونظم المعلومات.</p>
        </div>
        <div class="card">
          <div class="card-icon">🩺</div>
          <h3>كلية الطب البشري والجراحة</h3>
          <p>برامج طبية متطورة ومستشفى تعليمي جامعي بأعلى المعايير.</p>
        </div>
        <div class="card">
          <div class="card-icon">⚙️</div>
          <h3>كلية الهندسة والتقنيات</h3>
          <p>الهندسة المدنية، الكهربائية، الميكانيكية والمعمارية.</p>
        </div>
        <div class="card">
          <div class="card-icon">⚖️</div>
          <h3>كلية القانون والعلوم القضائية</h3>
          <p>عراقة أكاديمية وتدريب عملي في المحاكم الصورية.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- تذييل الصفحة -->
  <footer>
    <div class="container footer-content">
      <p>© 2026 جامعة النيلين — الخرطوم، السودان. استضافة وإدارة عبر منصة BuildBox AI.</p>
      <div class="footer-links">
        <a href="login.html">تسجيل الدخول</a>
        <a href="dashboard.html">لوحة التحكم</a>
      </div>
    </div>
  </footer>

  <script src="js/app.js"></script>
</body>
</html>`
      },
      {
        id: 'f2',
        path: 'login.html',
        name: 'login.html',
        type: 'html',
        sizeBytes: 3100,
        updatedAt: '2026-09-08T07:18:00Z',
        content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تسجيل الدخول — بوابة الطلاب</title>
  <link rel="stylesheet" href="css/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body class="auth-page">
  <div class="auth-container">
    <div class="auth-box">
      <div class="auth-header">
        <span class="logo-large">🏛️</span>
        <h2>بوابة الطالب الجامعية</h2>
        <p>سجل دخولك برقم القيد الجامعي للوصول لمقرراتك ونتائجك</p>
      </div>

      <form id="loginForm" onsubmit="handleLogin(event)">
        <div class="form-group">
          <label for="studentId">رقم القيد / الرقم الجامعي</label>
          <input type="text" id="studentId" placeholder="مثال: NL-2024-8842" value="NL-2024-8842" required>
        </div>

        <div class="form-group">
          <label for="password">كلمة المرور الأكاديمية</label>
          <input type="password" id="password" value="••••••••" required>
        </div>

        <div class="form-row">
          <label class="remember-me">
            <input type="checkbox" checked> تذكر بياناتي
          </label>
          <a href="#" class="forgot-link">نسيت كلمة المرور؟</a>
        </div>

        <button type="submit" class="btn-primary w-full">دخول إلى البوابة الأكاديمية</button>
      </form>

      <div class="auth-footer">
        <a href="index.html">← العودة للصفحة الرئيسية</a>
      </div>
    </div>
  </div>
  <script src="js/app.js"></script>
</body>
</html>`
      },
      {
        id: 'f3',
        path: 'dashboard.html',
        name: 'dashboard.html',
        type: 'html',
        sizeBytes: 4800,
        updatedAt: '2026-09-08T07:22:00Z',
        content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>لوحة تحكم الطالب — جامعة النيلين</title>
  <link rel="stylesheet" href="css/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body class="dashboard-body">
  <div class="dashboard-wrapper">
    <!-- الشريط الجانبي -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span>🏛️</span>
        <h3>جامعة النيلين</h3>
      </div>
      <div class="user-profile-widget">
        <div class="avatar">م</div>
        <div>
          <h4>محمد عثمان كمال</h4>
          <span class="subtext">كلية علوم الحاسوب - السنة الرابعة</span>
        </div>
      </div>
      <nav class="sidebar-menu">
        <a href="#" class="active">📊 المقررات الدراسية</a>
        <a href="#">📅 الجدول الأسبوعي</a>
        <a href="#">📝 كشف الدرجات</a>
        <a href="#">💳 الرسوم والمعاملات</a>
        <a href="index.html" class="logout-link">🚪 تسجيل الخروج</a>
      </nav>
    </aside>

    <!-- المحتوى الرئيسي -->
    <main class="main-content">
      <header class="dash-topbar">
        <h2>مرحباً، محمد عثمان 👋</h2>
        <div class="gpa-badge">المعدل التراكمي (CGPA): <strong>3.86 / 4.00 (ممتاز)</strong></div>
      </header>

      <!-- بطاقات سريعة -->
      <div class="dash-cards">
        <div class="stat-box">
          <span class="stat-title">المقررات المسجلة</span>
          <span class="stat-num">6 مقررات</span>
          <span class="stat-desc">18 ساعة معتمدة</span>
        </div>
        <div class="stat-box">
          <span class="stat-title">نسبة الحضور</span>
          <span class="stat-num">96%</span>
          <span class="stat-desc">ممتازة (لا إنذارات)</span>
        </div>
        <div class="stat-box">
          <span class="stat-title">المهام والاختبارات القادمة</span>
          <span class="stat-num">2 مهام</span>
          <span class="stat-desc">مشروع الذكاء الاصطناعي الأربعاء</span>
        </div>
      </div>

      <!-- جدول المقررات -->
      <div class="content-box">
        <h3>جدول المقررات الحالية للفصل الدراسي</h3>
        <table class="styled-table">
          <thead>
            <tr>
              <th>رمز المقرر</th>
              <th>اسم المادة</th>
              <th>أستاذ المادة</th>
              <th>القاعة</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>CS-412</td>
              <td>أنظمة الذكاء الاصطناعي وتعلم الآلة</td>
              <td>د. طارق الجزولي</td>
              <td>قاعة الخوارزمي 3</td>
              <td><span class="tag-status success">نشط</span></td>
            </tr>
            <tr>
              <td>CS-408</td>
              <td>أمن الشبكات والتشفير السحابي</td>
              <td>د. سامية عبد الرحيم</td>
              <td>مختبر الحاسوب 1</td>
              <td><span class="tag-status success">نشط</span></td>
            </tr>
            <tr>
              <td>SE-402</td>
              <td>إدارة مشاريع البرمجيات الحرة</td>
              <td>د. عمر الفكي</td>
              <td>قاعة ابن الهيثم</td>
              <td><span class="tag-status success">نشط</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
  <script src="js/app.js"></script>
</body>
</html>`
      },
      {
        id: 'f4',
        path: 'css/style.css',
        name: 'style.css',
        type: 'css',
        sizeBytes: 5200,
        updatedAt: '2026-09-08T07:25:00Z',
        content: `/* أنماط بوابة جامعة النيلين - تصميم سوداني أنيق وأصيل */
:root {
  --primary: #047857; /* Emerald Sudanese University Green */
  --primary-dark: #065f46;
  --primary-light: #10b981;
  --accent: #d97706; /* Warm Amber */
  --bg-dark: #0f172a;
  --surface: #ffffff;
  --text-main: #1e293b;
  --text-muted: #64748b;
  --border: #e2e8f0;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: 'Cairo', sans-serif;
}

body {
  background-color: #f8fafc;
  color: var(--text-main);
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* شريط التنقل */
.navbar {
  background: #ffffff;
  border-bottom: 2px solid #e2e8f0;
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  font-size: 2.2rem;
}

.brand h1 {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--primary);
}

.tagline {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.nav-links a {
  text-decoration: none;
  color: var(--text-main);
  font-weight: 600;
  transition: color 0.2s;
}

.nav-links a:hover, .nav-links a.active {
  color: var(--primary);
}

.btn-login {
  background: var(--primary);
  color: #fff !important;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(4, 120, 87, 0.25);
}

/* Hero Section */
.hero {
  padding: 4rem 0;
  background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 50%, #ffffff 100%);
  border-bottom: 1px solid #d1fae5;
}

.hero-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 3rem;
  align-items: center;
}

.badge {
  background: #d1fae5;
  color: var(--primary-dark);
  font-weight: 700;
  font-size: 0.85rem;
  padding: 0.35rem 0.9rem;
  border-radius: 9999px;
  display: inline-block;
  margin-bottom: 1rem;
}

.hero-text h2 {
  font-size: 2.3rem;
  line-height: 1.3;
  color: #064e3b;
  margin-bottom: 1rem;
}

.hero-text p {
  color: #334155;
  font-size: 1.05rem;
  margin-bottom: 1.5rem;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.btn-primary {
  background: var(--primary);
  color: #fff;
  padding: 0.75rem 1.6rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 700;
  display: inline-block;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(4, 120, 87, 0.3);
}

.btn-secondary {
  background: #fff;
  color: var(--primary);
  border: 2px solid var(--primary);
  padding: 0.75rem 1.4rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 700;
}

.stats-row {
  display: flex;
  gap: 1.5rem;
  border-top: 1px solid #cbd5e1;
  padding-top: 1.5rem;
}

.stat-card strong {
  display: block;
  font-size: 1.4rem;
  color: var(--primary);
}

.stat-card span {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.hero-card {
  background: #ffffff;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.06);
  border: 1px solid #e2e8f0;
}

.quick-notice h3 {
  font-size: 1.2rem;
  color: #1e293b;
  margin-bottom: 1rem;
}

.quick-notice ul {
  list-style: none;
  margin-bottom: 1.5rem;
}

.quick-notice li {
  position: relative;
  padding-right: 1.5rem;
  margin-bottom: 0.8rem;
  font-size: 0.95rem;
}

.quick-notice li::before {
  content: "•";
  position: absolute;
  right: 0;
  color: var(--primary);
  font-size: 1.5rem;
  line-height: 1;
}

.btn-preview-dash {
  display: block;
  text-align: center;
  background: #f1f5f9;
  color: #334155;
  padding: 0.6rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
}

/* الكليات */
.section {
  padding: 4rem 0;
}

.section-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.section-header h2 {
  font-size: 1.8rem;
  color: var(--primary-dark);
}

.colleges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.card {
  background: #fff;
  padding: 1.8rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
}

.card-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.card h3 {
  font-size: 1.15rem;
  margin-bottom: 0.5rem;
  color: #0f172a;
}

.card p {
  font-size: 0.9rem;
  color: var(--text-muted);
}

/* صفحة تسجيل الدخول */
.auth-page {
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.auth-box {
  background: #fff;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
  width: 100%;
  max-width: 440px;
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo-large {
  font-size: 3rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.95rem;
  direction: ltr;
  text-align: right;
}

.form-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
}

.w-full {
  width: 100%;
}

.auth-footer {
  margin-top: 1.5rem;
  text-align: center;
}

.auth-footer a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}

/* لوحة التحكم */
.dashboard-wrapper {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}

.sidebar {
  background: #064e3b;
  color: #fff;
  padding: 1.5rem;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 2rem;
}

.user-profile-widget {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: rgba(255,255,255,0.1);
  padding: 0.8rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.avatar {
  background: #10b981;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.sidebar-menu a {
  display: block;
  color: #e2e8f0;
  text-decoration: none;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 0.4rem;
  font-weight: 600;
}

.sidebar-menu a.active, .sidebar-menu a:hover {
  background: rgba(255,255,255,0.15);
  color: #fff;
}

.main-content {
  padding: 2rem;
  background: #f8fafc;
}

.dash-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.gpa-badge {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #6ee7b7;
  padding: 0.5rem 1rem;
  border-radius: 8px;
}

.dash-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}

.stat-box {
  background: #fff;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.stat-title {
  display: block;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.stat-num {
  display: block;
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--primary-dark);
  margin: 0.3rem 0;
}

.stat-desc {
  font-size: 0.8rem;
  color: #64748b;
}

.styled-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0,0,0,0.03);
  margin-top: 1rem;
}

.styled-table th, .styled-table td {
  padding: 0.9rem 1.2rem;
  text-align: right;
  border-bottom: 1px solid #e2e8f0;
}

.styled-table th {
  background: #f1f5f9;
  font-weight: 700;
}

.tag-status {
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.tag-status.success {
  background: #dcfce7;
  color: #15803d;
}

footer {
  background: #0f172a;
  color: #94a3b8;
  padding: 2rem 0;
  font-size: 0.9rem;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-links a {
  color: #cbd5e1;
  text-decoration: none;
  margin-right: 1.5rem;
}

@media (max-width: 768px) {
  .hero-grid {
    grid-template-columns: 1fr;
  }
  .dashboard-wrapper {
    grid-template-columns: 1fr;
  }
  .dash-cards {
    grid-template-columns: 1fr;
  }
}
`
      },
      {
        id: 'f5',
        path: 'js/app.js',
        name: 'app.js',
        type: 'javascript',
        sizeBytes: 1200,
        updatedAt: '2026-09-08T07:28:00Z',
        content: `// تفاعل بوابة جامعة النيلين الذكية
console.log("جامعة النيلين — البوابة الأكاديمية تعمل بنجاح.");

function handleLogin(e) {
  e.preventDefault();
  const studentId = document.getElementById('studentId').value;
  if (!studentId) {
    alert("يرجى إدخال رقم القيد الجامعي");
    return;
  }
  // التوجيه إلى لوحة التحكم
  window.location.href = "dashboard.html";
}
`
      },
      {
        id: 'f6',
        path: 'README.md',
        name: 'README.md',
        type: 'markdown',
        sizeBytes: 850,
        updatedAt: '2026-09-08T07:30:00Z',
        content: `# بوابة جامعة النيلين الذكية (Sudanese University Project)

مشروع جامعي متكامل تم إنشاؤه عبر **BuildBox AI**.

## الميزات:
- صفحة رئيسية مع إحصائيات وعرض الكليات والأقسام
- بوابة تسجيل دخول الطالب مع تذكر البيانات
- لوحة تحكم أكاديمية كاملة (المقررات، النتائج، المعدل التراكمي)
- تصميم متجاوب لجميع الشاشات
`
      }
    ]
  },
  {
    id: 'proj-bot',
    name: 'بوت تلغرام الذكي (SudaBot)',
    slug: 'telegram-bot',
    description: 'بوت تلغرام لإدارة الملفات والمشاريع واستقبال ملفات ZIP وفكها مباشرة.',
    type: 'telegram-bot',
    status: 'active',
    deployedUrl: 'https://t.me/BuildBox_Workspace_bot',
    createdAt: '2026-09-04T12:00:00Z',
    updatedAt: '2026-09-07T15:20:00Z',
    sizeBytes: 1.2 * 1024 * 1024,
    tags: ['بوت', 'تلغرام', 'أتمتة'],
    versionHistory: [
      { id: 'v1', version: '1.0.0', description: 'إطلاق البوت الأساسي وأوامر /project', timestamp: '2026-09-04', fileCount: 2 }
    ],
    files: [
      {
        id: 'fb1',
        path: 'bot.js',
        name: 'bot.js',
        type: 'javascript',
        sizeBytes: 2400,
        updatedAt: '2026-09-07T15:10:00Z',
        content: `// Telegram Bot for BuildBox Workspace
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "DEMO_BOT_KEY";

console.log("SudaBot is listening for incoming webhook events...");

function processMessage(msg) {
  if (msg.text === "/start") {
    return "مرحباً بك في BuildBox Bot! 🤖\\nارسل /project لعرض مشاريعك أو ارفع ملف ZIP ليتم فكه ونشره فوراً.";
  }
  if (msg.text === "/project") {
    return "📁 مشاريعك النشطة:\\n1️⃣ بوابة جامعة النيلين\\n2️⃣ تطبيق المدرسة\\n3️⃣ بوت تلغرام الذكي";
  }
  return "تم استلام رسالتك وتحديث الـ Workspace.";
}
`
      },
      {
        id: 'fb2',
        path: 'config.json',
        name: 'config.json',
        type: 'json',
        sizeBytes: 450,
        updatedAt: '2026-09-07T15:15:00Z',
        content: `{
  "botName": "BuildBox Workspace Bot",
  "username": "@BuildBox_Workspace_bot",
  "webhookEnabled": true,
  "autoExtractZip": true,
  "maxUploadSizeMb": 50
}`
      }
    ]
  },
  {
    id: 'proj-school',
    name: 'تطبيق المدرسة الذكية (school-app)',
    slug: 'school-app',
    description: 'تطبيق ويب لإدارة الحصص والواجبات المدرسية وتقارير أداء الطلاب.',
    type: 'html-css-js',
    status: 'draft',
    createdAt: '2026-09-02T14:00:00Z',
    updatedAt: '2026-09-06T11:00:00Z',
    sizeBytes: 2.1 * 1024 * 1024,
    tags: ['مدرسة', 'تعليم', 'تطبيق'],
    versionHistory: [
      { id: 'v1', version: '0.9.0', description: 'الهيكل التجريبي الأولي', timestamp: '2026-09-02', fileCount: 3 }
    ],
    files: [
      {
        id: 'fs1',
        path: 'index.html',
        name: 'index.html',
        type: 'html',
        sizeBytes: 2800,
        updatedAt: '2026-09-06T10:30:00Z',
        content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>منصة المدرسة الذكية</title>
  <style>
    body { font-family: sans-serif; background: #f8fafc; padding: 2rem; color: #1e293b; }
    .card { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    h1 { color: #2563eb; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🏫 منصة المدرسة الذكية</h1>
    <p>متابعة الواجبات، الحضور والانصراف، والتقارير الأسبوعية للطلاب وأولياء الأمور.</p>
  </div>
</body>
</html>`
      }
    ]
  }
];

export const INITIAL_WORKSPACE_FILES: WorkspaceFile[] = [
  {
    id: 'wf1',
    name: 'شهادة_التخرج_والدرجات.pdf',
    path: 'Files/شهادة_التخرج_والدرجات.pdf',
    category: 'documents',
    type: 'pdf',
    sizeBytes: 2.4 * 1024 * 1024,
    updatedAt: '2026-09-07T12:00:00Z',
    tags: ['جامعة', 'شهادة', 'رسمي'],
    contentPreview: 'شهادة بكالوريوس الشرف في علوم الحاسوب وتقانة المعلومات — مرتبة الشرف الأولى'
  },
  {
    id: 'wf2',
    name: 'شعار_الجامعة_الرسمي.png',
    path: 'Files/شعار_الجامعة_الرسمي.png',
    category: 'images',
    type: 'image',
    sizeBytes: 850 * 1024,
    updatedAt: '2026-09-06T09:30:00Z',
    tags: ['شعار', 'تصميم']
  },
  {
    id: 'wf3',
    name: 'university-project.zip',
    path: 'Files/university-project.zip',
    category: 'archives',
    type: 'zip',
    sizeBytes: 4.8 * 1024 * 1024,
    updatedAt: '2026-09-08T06:00:00Z',
    tags: ['أرشيف', 'نسخة_كاملة']
  },
  {
    id: 'wf4',
    name: 'إدارة_الطلاب_والدرجات.xlsx',
    path: 'Files/إدارة_الطلاب_والدرجات.xlsx',
    category: 'documents',
    type: 'sheet',
    sizeBytes: 520 * 1024,
    updatedAt: '2026-09-05T14:20:00Z',
    tags: ['بيانات', 'إكسل', 'درجات'],
    contentPreview: 'جدول أسماء 450 طالباً مع المواد المسجلة، الرسوم، والدرجات النهائية'
  },
  {
    id: 'wf5',
    name: 'عرض_تقديمي_الذكاء_الاصطناعي.pptx',
    path: 'Files/عرض_تقديمي_الذكاء_الاصطناعي.pptx',
    category: 'documents',
    type: 'doc',
    sizeBytes: 12.4 * 1024 * 1024,
    updatedAt: '2026-09-04T18:10:00Z',
    tags: ['عرض', 'ذكاء_اصطناعي'],
    contentPreview: 'سلايدات شاملة عن مستقبل الذكاء الاصطناعي في التعليم الجامعي والمصارف'
  },
  {
    id: 'wf6',
    name: 'backup_full_2026_09_01.tar.gz',
    path: 'Backups/backup_full_2026_09_01.tar.gz',
    category: 'backups',
    type: 'binary',
    sizeBytes: 380 * 1024 * 1024,
    updatedAt: '2026-09-01T00:00:00Z',
    tags: ['نسخ_احتياطي', 'تلقائي']
  }
];

export const MARKETPLACE_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'tpl-university',
    title: 'موقع جامعة سودانية متكامل',
    titleEn: 'Sudanese University Portal',
    category: 'تعليم وأكاديميا',
    badge: 'الأكثر طلباً ⭐',
    icon: '🏛️',
    description: 'بوابة جامعية كاملة تشمل صفحة ترحيبية، كليات وأقسام، بوابة تسجيل دخول الطلاب، ولوحة تحكم المقررات الدراسية.',
    tags: ['جامعة', 'تسجيل دخول', 'لوحة تحكم', 'أخبار'],
    files: [
      {
        path: 'index.html',
        type: 'html',
        content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>جامعة الخرطوم — الصرح الأكاديمي العريق</title>
  <style>
    body { font-family: sans-serif; margin: 0; background: #f0fdf4; }
    header { background: #065f46; color: white; padding: 1.5rem; display: flex; justify-content: space-between; }
    .hero { padding: 3rem 1.5rem; text-align: center; }
    .btn { background: #059669; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 1rem; }
  </style>
</head>
<body>
  <header>
    <h2>🏛️ جامعة الخرطوم</h2>
    <a href="login.html" class="btn">بوابة الطلاب</a>
  </header>
  <div class="hero">
    <h1>مرحباً بكم في بوابة التعليم الإلكتروني</h1>
    <p>أكثر من 100 عام من الريادة في العلوم والبحث العلمي.</p>
  </div>
</body>
</html>`
      },
      {
        path: 'login.html',
        type: 'html',
        content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><title>تسجيل الدخول</title></head>
<body style="font-family: sans-serif; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f1f5f9;">
  <form style="background:white; padding:2rem; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.1); width:320px;">
    <h3>بوابة الدخول الموحد</h3>
    <input type="text" placeholder="الرقم الجامعي" style="width:100%; padding:0.6rem; margin:0.8rem 0; box-sizing:border-box;">
    <button style="width:100%; background:#065f46; color:white; border:none; padding:0.75rem; border-radius:6px; cursor:pointer;">دخول</button>
  </form>
</body>
</html>`
      }
    ]
  },
  {
    id: 'tpl-ecommerce',
    title: 'متجر إلكتروني سوداني حديث',
    titleEn: 'Modern E-Commerce Store',
    category: 'تجارة إلكترونية',
    badge: 'شامل الدفع',
    icon: '🛒',
    description: 'متجر تسوق إلكتروني مع سلة مشتريات تفاعلية، دعم الدفع عبر بنكك وفوري، وكتالوج للمنتجات مع بحث وتصفية.',
    tags: ['متجر', 'سلة', 'بنكك', 'تجارة'],
    files: [
      {
        path: 'index.html',
        type: 'html',
        content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>سودا ماركت — تسوق بأمان وسرعة</title>
  <style>
    body { font-family: sans-serif; margin: 0; background: #fafafa; }
    .header { background: #1e293b; color: white; padding: 1rem 2rem; display: flex; justify-content: space-between; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; padding: 2rem; }
    .item { background: white; padding: 1rem; border-radius: 8px; border: 1px solid #e5e7eb; }
    .btn-buy { background: #2563eb; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="header">
    <h2>🛍️ سودا ماركت</h2>
    <span>السلة (0 عناصر)</span>
  </div>
  <div class="grid">
    <div class="item">
      <h3>هاتف ذكي 5G</h3>
      <p>أحدث إصدار مع ضمان عام</p>
      <strong>250,000 ج.س</strong><br><br>
      <button class="btn-buy" onclick="alert('تمت الإضافة للسلة!')">أضف للسلة</button>
    </div>
    <div class="item">
      <h3>سماعات لاسلكية</h3>
      <p>عزل ضوضاء فائق وبطارية تدوم</p>
      <strong>45,000 ج.س</strong><br><br>
      <button class="btn-buy" onclick="alert('تمت الإضافة للسلة!')">أضف للسلة</button>
    </div>
  </div>
</body>
</html>`
      }
    ]
  },
  {
    id: 'tpl-portfolio',
    title: 'معرض أعمال للمطورين والمصممين',
    titleEn: 'Developer & Creator Portfolio',
    category: 'شخصي وبورتفوليو',
    badge: 'تصميم فخم',
    icon: '🌐',
    description: 'صفحة شخصية حديثة مع قسم المشاريع، المهارات التقنية، السيرة الذاتية، وزر تواصل مباشر عبر واتساب وتلغرام.',
    tags: ['بورتفوليو', 'سيرة ذاتية', 'مطور', 'أعمال'],
    files: [
      {
        path: 'index.html',
        type: 'html',
        content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>معرض أعمالي — مطور برمجيات متكامل</title>
  <style>
    body { font-family: sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 2rem; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { color: #38bdf8; font-size: 2.5rem; }
    .skills span { background: #1e293b; padding: 0.4rem 0.8rem; border-radius: 9999px; margin-left: 0.5rem; font-size: 0.85rem; border: 1px solid #334155; }
  </style>
</head>
<body>
  <div class="container">
    <h1>أهلاً، أنا مطور ويب سحابي 👋</h1>
    <p>أبني تطبيقات عالية الأداء باستخدام أحدث التقنيات وأدوات الذكاء الاصطناعي.</p>
    <div class="skills">
      <span>React</span>
      <span>TypeScript</span>
      <span>Node.js</span>
      <span>Cloud Architecture</span>
      <span>AI Engineering</span>
    </div>
  </div>
</body>
</html>`
      }
    ]
  },
  {
    id: 'tpl-dashboard',
    title: 'لوحة تحكم إدارية (Admin Dashboard)',
    titleEn: 'Modern SaaS Dashboard',
    category: 'إدارة وأعمال',
    badge: 'مخططات وبيانات',
    icon: '📱',
    description: 'لوحة تحكم احترافية مزودة بمخططات إحصائية، جداول مستخدمين قابلة للفرز، وبطاقات أداء للمبيعات والعمليات.',
    tags: ['لوحة تحكم', 'إحصائيات', 'إدارة'],
    files: [
      {
        path: 'index.html',
        type: 'html',
        content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>لوحة التحكم الإدارية</title>
  <style>
    body { font-family: sans-serif; background: #f8fafc; margin: 0; padding: 1.5rem; color: #0f172a; }
    .stats { display: flex; gap: 1rem; margin-bottom: 2rem; }
    .box { background: white; padding: 1.5rem; border-radius: 10px; flex: 1; border: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <h2>📊 لوحة القيادة العامة</h2>
  <div class="stats">
    <div class="box"><h3>1,420</h3><p>المستخدمين الجدد</p></div>
    <div class="box"><h3>$48,900</h3><p>إجمالي الإيرادات</p></div>
    <div class="box"><h3>99.98%</h3><p>جاهزية السيرفرات</p></div>
  </div>
</body>
</html>`
      }
    ]
  },
  {
    id: 'tpl-telegram-bot',
    title: 'بوت تلغرام متعدد المهام (Telegram Bot)',
    titleEn: 'Multi-purpose Telegram Bot',
    category: 'أتمتة وروبوتات',
    badge: 'جاهز للربط',
    icon: '🤖',
    description: 'قالب لبوت تلغرام يتصل بمساحة التخزين السحابية، يتيح استقبال الملفات، الأوامر السريعة، وتنبيهات النشر.',
    tags: ['بوت', 'تلغرام', 'أتمتة', 'ويب هوك'],
    files: [
      {
        path: 'bot.js',
        type: 'javascript',
        content: `// Telegram Bot Webhook Handler
console.log("Telegram Bot Template Ready!");
`
      }
    ]
  }
];

export const initialProjects = INITIAL_PROJECTS;
export const initialWorkspaceFiles = INITIAL_WORKSPACE_FILES;
export const initialStorageQuota = INITIAL_STORAGE_QUOTA;
export const initialStoragePlans: StoragePlan[] = INITIAL_STORAGE_PLANS.map((p) => ({
  ...p,
  name: p.nameAr,
  period: 'شهر',
  isPopular: p.id === 'developer',
}));
export const initialTemplates: ProjectTemplate[] = MARKETPLACE_TEMPLATES.map((t) => ({
  ...t,
  name: t.title,
  thumbnail: t.icon,
}));
