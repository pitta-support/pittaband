(function () {
  "use strict";

  /**
   * D-day 캠페인 설정
   *
   * 공통 — link (액션 버튼 URL, 캠페인마다 수정)
   *   href          : 실제 예매·구매 URL (인터파크, 멜론 등)
   *   external      : true면 새 탭 (target=_blank)
   *   fallbackHref  : href가 비어 있을 때 사이트 내부 페이지
   *   labelI18n     : 버튼 문구 i18n 키 (생략 시 type별 기본값)
   *
   * concert
   *   dates[2]      : 공연일 2일
   *   예매하기      : 첫 공연일 00:00(KST) 전까지 (link.href)
   *   공연일        : 배너 (버튼 없음)
   *   마지막 공연일 종료 후 자동 숨김
   *
   * festival
   *   date          : 페스티벌일 1일
   *   예매하기      : 당일 00:00(KST) 전까지 (link.href)
   *   당일          : 배너 (버튼 없음)
   *   당일 종료 후 자동 숨김
   *
   * album
   *   date          : 발매일 1일
   *   구매하기      : 발매일~+displayDays (link.href)
   *   displayDays 경과 후 자동 숨김
   *
   * hero (선택) — index Hero Section 템플릿 (scripts/hero-event.js)
   *   image, logo, lines[], dateI18n, venue, tagI18n, buttonI18n, stars …
   *   concert / festival 캠페인에 hero 를 넣으면 활성 기간 동안 Hero 에 표시
   */
  window.DDAY_CAMPAIGNS = [
    {
      id: "nexus-live-2026",
      type: "concert",
      enabled: false,
      priority: 10,
      dates: ["2026-09-15", "2026-09-16"],
      showFrom: "2026-01-01",
      targetTime: "19:00:00",
      link: {
        href: "https://ticket.interpark.com/Contents/SmartTicket",
        external: true,
        fallbackHref: "concert.html",
      },
      countdown: {
        tagI18n: "dday.tag",
        eventI18n: "dday.campaigns.nexusLive.event",
        eventFallback: "NEXUS LIVE · SEOUL",
        logoSrc: "images/dday/nexus-live-logo.png",
        logoAltI18n: "dday.campaigns.nexusLive.event",
        logoAltFallback: "NEXUS LIVE · SEOUL",
      },
      hero: {
        image: "images/hero/nexus-live.jpg",
        imageAltI18n: "hero.events.nexusLive2026.imageAlt",
        imageAltFallback: "NEXUS LIVE · SEOUL",
        tagI18n: "dday.tag",
        tagFallback: "UPCOMING",
        logo: "images/dday/nexus-live-logo.png",
        logoAltFallback: "NEXUS LIVE · SEOUL",
        lines: [
          {
            i18n: "hero.events.nexusLive2026.lead",
            class: "lead",
            fallback: "Pitta Band Live in Seoul",
          },
          {
            i18n: "hero.events.nexusLive2026.subtitle",
            fallback: "NEXUS LIVE — two-night run",
          },
          {
            i18n: "hero.events.nexusLive2026.hook",
            class: "hook",
            fallback: "See you at the show!",
          },
        ],
        dateI18n: "hero.events.nexusLive2026.date",
        dateFallback: "2026. 09. 15 (Tue) – 16 (Wed)",
        venue: {
          i18n: "hero.events.nexusLive2026.venue",
          fallback: "Seoul",
          mapKo: "https://maps.app.goo.gl/Hx85dyCraiNNVtUv7",
          mapDefault: "https://maps.app.goo.gl/Hx85dyCraiNNVtUv7",
          mapAriaI18n: "hero.events.nexusLive2026.venueMapAria",
          mapAriaFallback: "Open venue map",
        },
        buttonI18n: "dday.linkConcert",
        stars: true,
      },
      banner: {
        titleI18n: "dday.campaigns.nexusLive.bannerTitle",
        titleFallback: "NEXUS LIVE · SEOUL",
        badgeI18n: "dday.liveNow",
        badgeFallback: "LIVE",
        logoSrc: "images/dday/nexus-live-logo.png",
      },
    },
    {
      id: "letslock2026",
      type: "festival",
      enabled: true,
      priority: 8,
      date: "2026-10-03",
      showFrom: "2026-08-18",
      // targetTime: "14:00:00",
      link: {
        href: "https://nol.yanolja.com/ticket/products/26010980",
        external: true,
        fallbackHref: "festival.html",
      },
      countdown: {
        tagI18n: "dday.tagFestival",
        eventI18n: "dday.campaigns.summerFest.event",
        eventFallback: "LetsRock Festival",
        logoSrc: "images/dday/lets_lock.svg",
        logoAltFallback: "LetsRock Festival",
        venueI18n: "hero.events.letslock2026.venue",
        venueFallback: "난지한강공원",
      },
      hero: {
        image: "images/hero/HQEJpaSbkAAv-fi.jpg",
        imageAltI18n: "hero.events.letslock2026.imageAlt",
        imageAltFallback: "PITTA Lets Rock Festival 2026",
        tagI18n: "dday.tag",
        tagFallback: "UPCOMING",
        logo: "images/dday/lets_lock.svg",
        logoAltFallback: "Lets Rock Festival",
        logoClass: "hero-event__logo--letslock",
        lines: [
          {
            i18n: "hero.events.letslock2026.lead",
            class: "lead",
            fallback: "숨길 수 없는 록커의 본색",
          },
          {
            i18n: "hero.events.letslock2026.subtitle",
            fallback: "다양한 음악적 스펙트럼을 보여주는 팔색조",
          },
          {
            i18n: "hero.events.letslock2026.artist",
            class: "artist",
            fallback: "보컬 PITTA(강형호)",
          },
          {
            i18n: "hero.events.letslock2026.hook",
            class: "hook",
            fallback: "렛츠락페스티벌에서 만나요!",
          },
        ],
        dateI18n: "hero.events.letslock2026.date",
        dateFallback: "2026. 10. 03 (Sat)",
        venue: {
          i18n: "hero.events.letslock2026.venue",
          fallback: "난지한강공원",
          mapKo: "https://naver.me/5UEFjyW3",
          mapDefault: "https://maps.app.goo.gl/Hx85dyCraiNNVtUv7",
          mapAriaI18n: "hero.events.letslock2026.venueMapAria",
          mapAriaFallback: "난지한강공원 지도 열기",
        },
        buttonI18n: "dday.linkFestival",
        stars: true,
      },
      banner: {
        titleI18n: "dday.campaigns.summerFest.bannerTitle",
        titleFallback: "SEOUL PARK ROCK FEST",
        badgeI18n: "dday.festNow",
        badgeFallback: "ON STAGE",
        logoSrc: "images/dday/nexus-live-logo.png",
      },
    },
    {
      id: "paradox-release",
      type: "album",
      enabled: false,
      priority: 5,
      date: "2026-03-20",
      displayDays: 7,
      showFrom: "2026-02-01",
      link: {
        href: "https://www.melon.com/album/detail.htm",
        external: true,
        fallbackHref: "album.html",
      },
      countdown: {
        tagI18n: "dday.tagAlbum",
        eventI18n: "dday.campaigns.paradox.event",
        eventFallback: "PARADOX",
        logoSrc: "images/albums/paradox.png",
        logoAltFallback: "PARADOX",
      },
      banner: {
        titleI18n: "dday.campaigns.paradox.bannerTitle",
        titleFallback: "PARADOX",
        badgeI18n: "dday.outNow",
        badgeFallback: "OUT NOW",
        coverSrc: "images/albums/paradox.png",
      },
    },
  ];

  /** 활성 캠페인 2개 이상일 때 슬라이드 전환 */
  window.DDAY_SLIDER = {
    intervalMs: 6000,
  };
})();
