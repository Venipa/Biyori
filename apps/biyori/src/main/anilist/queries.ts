export const GET_CURRENT_USER = `
query {
  Viewer {
    id
    name
    avatar {
      large
    }
    createdAt
    statistics {
      anime {
        count
        episodesWatched
        minutesWatched
        meanScore
      }
    }
  }
}
`;

const MEDIA_FIELDS = `
id
idMal
description
episodes
title {
  romaji
  english
  native
}
coverImage {
  extraLarge
  large
}
bannerImage
synonyms
type
status
season
seasonYear
startDate { year month day }
endDate { year month day }
studios { nodes { name isAnimationStudio siteUrl } }
genres
format
meanScore
averageScore
popularity
isAdult
trailer {
  id
  site
}
nextAiringEpisode {
  episode
}
`;

const MEDIA_LIST_FIELDS = `
id
media {
  ${MEDIA_FIELDS}
}
status
score
progress
repeat
startedAt {
  year
  month
  day
}
updatedAt
completedAt {
  year
  month
  day
}
`;

export const GET_ALL_ANIMES_FROM_UID = `
query($id: Int!, $chunk: Int) {
  MediaListCollection(
    type: ANIME
    forceSingleCompletedList: true
    userId: $id
    chunk: $chunk
    perChunk: 500
  ) {
    lists {
      name
      status
      entries {
        ${MEDIA_LIST_FIELDS}
      }
    }
    hasNextChunk
  }
}
`;

export const SEARCH_MEDIA = `
query ($query: String!) {
  Page {
    pageInfo {
      currentPage
      hasNextPage
    }
    media(search: $query, type: ANIME) {
      id
      idMal
      description
      episodes
      title {
        romaji(stylised: true)
        english(stylised: true)
        native(stylised: true)
        userPreferred
      }
      coverImage {
        large
      }
      bannerImage
      synonyms
      type
      status
      season
      seasonYear
      studios { nodes { name isAnimationStudio } }
      genres
      format
      meanScore
      averageScore
      trailer {
        id
        site
      }
      nextAiringEpisode {
        episode
      }
    }
  }
}
`;

export const SEASON_MEDIA = `
query($season: MediaSeason!, $seasonYear: Int!, $page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo {
      currentPage
      hasNextPage
    }
    media(season: $season, seasonYear: $seasonYear, type: ANIME, sort: START_DATE) {
      ${MEDIA_FIELDS}
    }
  }
}
`;

export const GET_MEDIA_BY_ID = `
query($id: Int) {
  Media(id: $id, type: ANIME) {
    ${MEDIA_FIELDS}
  }
}
`;

export const SAVE_MEDIA_LIST_ENTRY = `
mutation(
  $mediaId: Int
  $status: MediaListStatus
  $progress: Int
  $score: Float
  $repeat: Int
  $notes: String
  $startedAt: FuzzyDateInput
  $completedAt: FuzzyDateInput
) {
  SaveMediaListEntry(
    mediaId: $mediaId
    status: $status
    progress: $progress
    score: $score
    repeat: $repeat
    notes: $notes
    startedAt: $startedAt
    completedAt: $completedAt
  ) {
    id
    status
    progress
    score
    repeat
    notes
    startedAt {
      year
      month
      day
    }
    completedAt {
      year
      month
      day
    }
    media {
      ${MEDIA_FIELDS}
    }
  }
}
`;
