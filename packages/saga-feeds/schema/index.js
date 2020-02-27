const { gql } = require('apollo-server-express')
const GraphQLObjectId = require('graphql-scalar-objectid')
const { GraphQLDateTime, GraphQLDate } = require('graphql-iso-date')

const { feedById, feedCreate, feedPosts, feedSearch, feedSubscribe, feedUnsubscribe } = require('./feed')
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

  type Query {
    feedById(id: MongoID!): Feed
    feedSearch(sort: Sort, sortDirection: SortDirection): [Feed]
    postById(id: MongoID!): Post
    userById(id: MongoID!): User
    userLogin(email: String!, password: String): User
    userSearch(sort: Sort): [User]
  }

  type Mutation {
    feedCreate(feedUrl: String!): [Feed]
    feedSubscribe(feedId: MongoID!): Feed
    feedUnsubscribe(feedId: MongoID!): Feed
    userCreate(displayName: String!, email: String!, password: String!, username: String!): User
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
    id: MongoID!
    identifier: String
    interests: [String]
    images: FeedImage
    isFeatured: Boolean
    isPublic: Boolean
    isVisible: Boolean
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
    postById,
    userById,
    userLogin,
    userSearch,
  },
  Mutation: {
    feedCreate,
    feedSubscribe,
    feedUnsubscribe,
    userCreate,
    userUpdate: () => {},
  },
  Feed: {
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
