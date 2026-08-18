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
