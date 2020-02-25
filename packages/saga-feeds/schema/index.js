const { gql } = require('apollo-server-express')
const GraphQLObjectId = require('graphql-scalar-objectid')
const { GraphQLDateTime, GraphQLDate } = require('graphql-iso-date')

const { feedById, feedCreate, feedSearch } = require('./feed')
const { postById, postContent } = require('./post')
const { userById, userCreate, userSearch, userToken } = require('./user')

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
    a_z
    popularity
    relevance
    updated_date
    z_a
  }

  type Query {
    feedById(id: MongoID!): Feed
    feedSearch(sort: Sort): [Feed]
    postById(id: MongoID!): Post
    userById(id: MongoID!): User
    userSearch(sort: Sort): [User]
  }

  type Mutation {
    feedCreate(feedUrl: String!): [Feed]
    feedSubscribe: Feed
    userCreate: User
    userUpdate: User
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
    followerCount: Int
    id: MongoID!
    identifier: String
    images: FeedImage
    isFeatured: Boolean
    isPublic: Boolean
    isVisible: Boolean
    language: String
    lastScrapedDate: DateTime
    posts: [Post]
    postCount: Int
    publishedDate: DateTime
    publisher: String
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
    postType: FeedType
    publishedDate: DateTime
    summary: String
    title: String
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
    userName: String
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
    postById,
    userById,
    userSearch,
  },
  Mutation: {
    feedCreate,
    feedSubscribe: () => {},
    userCreate,
    userUpdate: () => {},
  },
  Post: {
    content: postContent,
  },
  User: {
    token: userToken,
  },
}

module.exports = {
  resolvers,
  typeDefs,
}
