const { gql } = require('apollo-server-express')
const GraphQLObjectId = require('graphql-scalar-objectid')
const { GraphQLDateTime, GraphQLDate } = require('graphql-iso-date')

const { feedById, feedCreate, feedInterests, feedPosts, feedSearch, feedSubscribe, feedUnsubscribe } = require('./feed')
const { interestCreate, interestSearch, interestUpdate } = require('./interest')
const { postById, postContent, postFeed } = require('./post')
const { userById, userCreate, userLogin, userSearch, userToken } = require('./user')

const typeDefs = gql`
  scalar MongoID
  scalar Date
  scalar DateTime

  enum FeedType {
    audio
    video
    article
  }

  enum Sort {
    title
    favoriteCount
    postCount
    relevance
    updatedDate
  }

  enum SortDirection {
    asc
    desc
  }

  type PaginationSettings {
    limit: Int
    skip: Int
  }

  type Query {
    feedById(id: MongoID!): Feed
    feedSearch(sort: Sort, sortDirection: SortDirection): [Feed]
    interestSearch: [Interest]
    postById(id: MongoID!): Post
    userById(id: MongoID!): User
    userLogin(email: String!, password: String): User
    userSearch(sort: Sort): [User]
  }

  type Mutation {
    feedCreate(feedUrl: String!, interests: [MongoID]): [Feed]
    feedSubscribe(feedId: MongoID!): Feed
    feedUnsubscribe(feedId: MongoID!): Feed
    interestCreate(name: String!, parent: MongoID): Interest
    interestUpdate(name: String, parent: MongoID, id: MongoID!): Interest
    userCreate(displayName: String!, email: String!, password: String!, username: String!): User
    userUpdate: User
  }

  type Interest {
    name: String
    slug: String
    id: MongoID
    children: [Interest]
  }

  type FeedImage {
    featured: String
    openGraph: String
    favicon: String
    logo: String
  }

  type Feed {
    canonicalUrl: String
    copyright: String
    description: String
    favoriteCount: Int
    feedType: FeedType
    feedUrl: String!
    id: MongoID!
    identifier: String
    interests: [Interest]
    images: FeedImage
    isFeatured: Boolean
    isPublic: Boolean
    language: String
    posts: [Post]
    postCount: Int
    publishedDate: DateTime
    publisher: String
    subscriptionCount: Int
    summary: String
    title: String
    updatedDate: DateTime
    url: String
  }

  type PostEnclosure {
    description: String
    height: String
    id: MongoID!
    length: String
    medium: String
    title: String
    type: String
    url: String
    width: String
  }

  type PostImage {
    favicon: String
    featured: String
    logo: String
  }

  type Post {
    author: String
    canonicalUrl: String
    content: String
    commentUrl: String
    description: String
    direction: String
    enclosures: [PostEnclosure]
    favoriteCount: Int
    feed: Feed
    guid: String
    images: PostImage
    id: MongoID!
    identifier: String!
    interests: [String]
    isPublic: Boolean
    language: String
    postType: FeedType
    postUpdatedDate: DateTime
    publishedDate: DateTime
    summary: String
    themeColor: String
    title: String
    updatedAt: DateTime
    url: String
    wordCount: Int
  }

  type User {
    bio: String
    displayName: String
    email: String
    id: MongoID!
    interests: [String]
    isActive: Boolean
    isAdmin: Boolean
    username: String
    url: String
    token: String
  }
`

const resolvers = {
  Date: GraphQLDate,
  DateTime: GraphQLDateTime,
  MongoID: GraphQLObjectId,
  Query: {
    feedById,
    feedSearch,
    interestSearch,
    postById,
    userById,
    userLogin,
    userSearch,
  },
  Mutation: {
    feedCreate,
    feedSubscribe,
    feedUnsubscribe,
    interestCreate,
    interestUpdate,
    userCreate,
    userUpdate: () => {},
  },
  Feed: {
    interests: feedInterests,
    posts: feedPosts,
  },
  Post: {
    content: postContent,
    feed: postFeed,
  },
  User: {
    token: userToken,
  },
}

module.exports = {
  resolvers,
  typeDefs,
}
