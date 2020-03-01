const strip = require("strip");
const entities = require("entities");
const crypto = require("crypto");
const normalizeUrl = require("normalize-url");
const Mercury = require("@postlight/mercury-parser");
const sanitizeHtml = require("sanitize-html");

const config = require("../config");
const logger = require("./logger").getLogger();
const { processMeta } = require("./processMeta");
const Post = require("../models/post");

/**
 * Process a post, so that it can be saved
 * in the db.
 *
 * @param post {object} - the RSS item
 * @param forceUpdate {boolean} [false] - if true, the post is processed
 * again. otherwise, the previously processed post is returned. however,
 * if a post has not been found in the db, then it is processed despite
 * this flag setting. this is an attempt to minimize pinging the post's
 * source server.
 * @returns {object} - the normalized post
 */
const processPost = async (post, forceUpdate = false) => {
  const postIdentifier = createPostIdentifier(
    post.guid,
    post.link,
    post.enclosures
  );
  let normalized = await Post.find({ identifier: postIdentifier });

  if (forceUpdate || !normalized) {
    // if the post was not found, it's either a new post,
    // or maybe the post identifier changed
    normalized = await normalizePost(post);
  }

  return normalized;
};

/**
 * Normalize a post, so that it fits our model
 *
 * @param post - the RSS item
 * @returns {object} - a processed & normalized post
 */
const normalizePost = async post => {
  const postMeta = await processMeta(post.link);

  const processed = {
    postType: post.postType,
    summary: postMeta ? postMeta.description : "",
    description: strip(
      entities.decodeHTML(post.summary || post.description || "")
    ),
    enclosures: processEnclosures(post.enclosures),
    guid: post.guid,
    publishedDate: post.pubdate || post.pubDate,
    title: post.title,
    url: post.link ? normalizeUrl(post.link) : "",
    commentUrl: post.comments,
    images: {
      featured:
        postMeta && postMeta.image
          ? postMeta.image
          : post.image
          ? post.image.url
          : "",
      logo: postMeta ? postMeta.logo : ""
    },
    identifier: createPostIdentifier(post.guid, post.link, post.enclosures),
    interests: [],
    author: postMeta ? postMeta.author : ""
  };

  if (post.categories) {
    processed.interests = post.categories;
  }

  if (post["media:content"]) {
    const content = post["media:content"];
    processed.enclosures = processMedia(content, processed.enclosures);

    if (content["media:credit"]) {
      if (Array.isArray(content["media:credit"])) {
        content["media:credit"].map(credit =>
          processed.interests.push(credit["#"])
        );
      } else {
        processed.interests.push(content["media:credit"]["#"]);
      }
    }
  }

  if (post["media:group"]) {
    if (Array.isArray(post["media:group"]["media:content"])) {
      post["media:group"]["media:content"].map(content => {
        processed.enclosures = processMedia(content, processed.enclosures);
      });
    }
  }

  if (post["yt:videoid"]) {
    const youtubeId = post["yt:videoid"]["#"];

    processed.enclosures.push({
      type: "youtube",
      url: `https://www.youtube.com/watch?v=${youtubeId}`
    });

    if (post["media:group"] && !processed.description) {
      processed.description = post["media:group"]["media:description"]["#"];
    }
  }

  if (post["atom:author"]) {
    processed.author = post["atom:author"]["name"]
      ? post["atom:author"]["name"]["#"]
      : "";
  }

  processed.enclosures = filterEnclosures(processed.enclosures);

  if (
    processed.enclosures.length &&
    (!processed.images.featured || !processed.images.featured.length)
  ) {
    // if there is not a featured image, and there are enclosures,
    // try to find an enclosure image to use as the featured image.
    const images = processed.enclosures.filter(
      enclosure => enclosure.medium === "image"
    );
    if (images.length) {
      processed.images.featured = images[0].url;
    }
  }

  logger.debug(`processed and normalized post`, {
    ...processed
  });

  return processed;
};

/**
 * Create a post identifier from some of the fields of the RSS
 * item. This is used to attempt preventing duplicate posts
 * from a single feed. This is not a very stable
 *
 * @param guid {string} - the RSS item GUID, which is not always set
 * @param link {string} - the RSS item link
 * @param enclosures {array} - the array of enclosures on the RSS item
 * @returns {string}
 */
const createPostIdentifier = (guid, link, enclosures) => {
  // start the id with the guid and link
  let id = `${guid}:${link}`;

  // if there is an enclosure, try to use the first
  // enclosure's url in the id. it seems not so likely
  // to change
  if (enclosures && enclosures.length) {
    id += `:${enclosures[0].url}`;
  }
  return crypto
    .createHash("md5")
    .update(id)
    .digest("hex");
};

/**
 * Attempt to normalize a media:content item, so that it looks
 * the same as an enclosure
 *
 * @param content {object} - a media:content item from the RSS item
 * @param enclosures {array} - list of enclosures on the RSS item
 * @returns {*}
 */
const processMedia = (content, enclosures) => {
  const mainContent = content["@"];

  let type = mainContent.medium;

  if (!type && mainContent.type) {
    if (mainContent.type.indexOf("audio") >= 0) {
      type = "audio";
    } else if (mainContent.type.indexOf("video") >= 0) {
      type = "video";
    }
  }

  const contentTitle = content["media:title"]
    ? content["media:title"]["#"]
    : "";
  const contentDescription = content["media:description"]
    ? content["media:description"]["#"]
    : "";

  enclosures.push({
    url: mainContent.url,
    type: mainContent.type || "",
    length: mainContent.filesize || mainContent.length || "",
    width: mainContent.width || "",
    height: mainContent.height || "",
    title: contentTitle,
    description: contentDescription,
    medium: type
  });

  return enclosures;
};

/**
 * Try to normalize enclosures into a list of media, where
 * we can define media type (image, audio, video)
 *
 * @param enclosures {array} - list of enclosures on the RSS item
 * @returns {Array|*}
 */
const processEnclosures = enclosures => {
  if (
    !enclosures ||
    !Array.isArray(enclosures) ||
    !enclosures.length ||
    !enclosures[0].type
  ) {
    return [];
  }

  return enclosures.map(enclosure => {
    let medium = "";
    if (enclosure.type.indexOf("audio") >= 0) {
      medium = "audio";
    } else if (enclosure.type.indexOf("video") >= 0) {
      medium = "video";
    } else if (enclosure.type.indexOf("image") >= 0) {
      medium = "image";
    }
    return {
      ...enclosure,
      medium
    };
  });
};

/**
 * Ensure that each enclosure is unique. Also, sort by size,
 * so that the largest one is first.
 *
 * @param enclosures {array} - list of enclosures on the RSS item
 * @returns {array} - filtered and sorted enclosures
 */
const filterEnclosures = enclosures => {
  if (!enclosures || !Array.isArray(enclosures) || !enclosures.length) {
    return [];
  }

  const filtered = [];
  const urls = [];

  enclosures.forEach(enclosure => {
    if (urls.indexOf(enclosure.url) >= 0) {
      return false;
    } else {
      filtered.push(enclosure);
      urls.push(enclosure.url);
    }
  });

  const sorted = filtered.sort((a, b) => {
    return parseInt(b.length || 0) - parseInt(a.length || 0);
  });

  return sorted;
};

const getArticleContent = url => {
  return Mercury.parse(url, {
    headers: {
      "user-agent": config.userAgent
    }
  })
    .then(results => ({
      ...results,
      lead_image_url: results.url ? normalizeUrl(results.url) : results.url,
      url: results.url ? normalizeUrl(results.url) : results.url,
      content: results.content ? sanitizeHtml(results.content) : results.content
    }))
    .catch(error => {
      logger.warn(`Problem while trying to get article content`, {
        url,
        error: {
          message: error.message,
          stack: error.stack
        }
      });

      return null;
    });
};

const updatePostContent = async (id, url, forceUpdate = false) => {
  const post = await Post.findById(id);

  if (!forceUpdate && (!post || !post.postNeedsUpdating())) {
    return post;
  }

  logger.debug(`this post content is stale and needs updating`, {
    id: post._id,
    url: post.url
  });

  const parsed = await getArticleContent(url);

  if (!parsed) {
    // @TODO: the post might be gone, update the model to reflect this status
    return post;
  }

  return Post.findOneAndUpdate(
    { _id: id },
    {
      content: parsed.content,
      direction: parsed.direction,
      wordCount: parsed.word_count
    },
    {
      new: true
    }
  );
};

const updatePostMeta = async (id, url, forceUpdate = false) => {
  const post = await Post.findById(id);

  if (!forceUpdate && (!post || !post.postNeedsUpdating())) {
    return post;
  }

  logger.debug(`this post meta is stale and needs updating`, {
    id: post._id,
    url: post.url
  });

  const meta = await processMeta(url, true);

  if (!meta) {
    // @TODO: the post might be gone, update the model to reflect this status
    return post;
  }

  const updates = {
    summary: meta.description
  };

  if (meta.image) {
    updates.images = {
      featured: meta.image
    };
  }

  if (meta.author) {
    updates.author = meta.author;
  }

  return Post.findOneAndUpdate({ _id: id }, updates, { new: true });
};

module.exports = {
  processPost,
  updatePostContent,
  updatePostMeta
};
