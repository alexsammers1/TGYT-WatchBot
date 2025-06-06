import Sequelize, { Op, Transaction, QueryTypes } from 'sequelize';
import ErrorWithCode from './tools/errorWithCode';
import arrayByPart from './tools/arrayByPart';
import serviceId from './tools/serviceId';
import arrayDifference from './tools/arrayDifference';
import Main from './main';
import {ServiceChannel, ServiceInterface} from './checker';
import assertType from './tools/assertType';
import {Feed} from './ytPubSub';
import {appConfig} from './appConfig';
import {getDebug} from './tools/getDebug';

const debug = getDebug('app:db');
const ISOLATION_LEVELS = Transaction.ISOLATION_LEVELS;

export interface NewChat {
  id: string;
  channelId?: string | null;
  isHidePreview?: boolean;
  isMuted?: boolean;
  isSkipShortVideos?: boolean;
  sendTimeoutExpiresAt?: Date;
  parentChatId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ChatModel extends Sequelize.Model {
  declare id: string;
  declare channelId: string | null;
  declare isHidePreview: boolean;
  declare isMuted: boolean;
  declare isSkipShortVideos: boolean;
  declare sendTimeoutExpiresAt: Date;
  declare parentChatId: string | null;

  declare createdAt: Date;
  declare updatedAt: Date;
}
export interface ChatModelWithOptionalChannel extends ChatModel {
  channel: ChatModel | null;
}

export class ChannelModel extends Sequelize.Model {
  declare id: string;
  declare service: string;
  declare title: string;
  declare url: string;
  declare hasChanges: boolean;
  declare lastVideoPublishedAt: Date | null;
  declare lastSyncAt: Date;
  declare lastFullSyncAt: Date;
  declare syncTimeoutExpiresAt: Date;
  declare subscriptionExpiresAt: Date;
  declare subscriptionTimeoutExpiresAt: Date;

  declare createdAt: Date;
  declare updatedAt: Date;
}
export interface NewChannel {
  id: string;
  service: string;
  title: string;
  url: string;
  hasChanges?: boolean;
  lastVideoPublishedAt?: Date;
  lastSyncAt?: Date;
  lastFullSyncAt?: Date;
  syncTimeoutExpiresAt?: Date;
  subscriptionExpiresAt?: Date;
  subscriptionTimeoutExpiresAt?: Date;
}

export class YtPubSubModel extends Sequelize.Model {
  declare videoId: string;
  declare channelId: string | null;
  declare publishedAt: Date | null;
  declare lastSyncAt: Date;

  declare createdAt: Date;
}

export class ChatIdChannelIdModel extends Sequelize.Model {
  declare chatId: string;
  declare channelId: string;
  declare createdAt: Date;
}
export interface NewChatIdChannelIdModel {
  chatId: string;
  channelId: string;
}

export class VideoModel extends Sequelize.Model {
  declare id: string;
  declare url: string;
  declare title: string;
  declare previews: string;
  declare duration: string | null;
  declare channelId: string;
  declare publishedAt: Date;
  declare telegramPreviewFileId: string | null;
  declare mergedId: string | null;
  declare mergedChannelId: string | null;
  declare createdAt: Date;
}
export interface VideoModelWithChannel extends VideoModel {
  channel: ChannelModel;
}
export interface NewVideo {
  id: string;
  url: string;
  title: string;
  previews: string;
  duration?: string | null;
  channelId: string;
  publishedAt: Date;
  telegramPreviewFileId?: string | null;
  mergedId?: string | null;
  mergedChannelId?: string | null;
}

export class ChatIdVideoIdModel extends Sequelize.Model {
  declare id: number;
  declare chatId: string;
  declare videoId: string;
  declare createdAt: Date;
}
export interface NewChatIdVideoId {
  chatId: string;
  videoId: string;
}

class Db {
  private sequelize: Sequelize.Sequelize;
  constructor(private main: Main) {
    this.sequelize = new Sequelize.Sequelize(
      appConfig.db.database,
      appConfig.db.user,
      appConfig.db.password,
      {
        host: appConfig.db.host,
        port: appConfig.db.port,
        dialect: 'mariadb',
        omitNull: true,
        logging: false,
        /*dialectOptions: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_general_ci'
      },*/
        define: {
          charset: 'utf8mb4',
        },
        pool: {
          max: 30,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
      },
    );

    ChatModel.init(
      {
        id: {type: Sequelize.STRING(191), allowNull: false, primaryKey: true},
        channelId: {type: Sequelize.STRING(191), allowNull: true},
        isHidePreview: {type: Sequelize.BOOLEAN, defaultValue: false},
        isMuted: {type: Sequelize.BOOLEAN, defaultValue: false},
        isSkipShortVideos: {type: Sequelize.BOOLEAN, defaultValue: false},
        sendTimeoutExpiresAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: '1970-01-01 00:00:00',
        },
        parentChatId: {type: Sequelize.STRING(191), allowNull: true},
      },
      {
        sequelize: this.sequelize,
        modelName: 'chat',
        tableName: 'chats',
        timestamps: true,
        indexes: [
          {
            name: 'channelId_UNIQUE',
            unique: true,
            fields: ['channelId'],
          },
          {
            name: 'sendTimeoutExpiresAt_idx',
            fields: ['sendTimeoutExpiresAt'],
          },
        ],
      },
    );
    ChatModel.belongsTo(ChatModel, {
      foreignKey: 'channelId',
      targetKey: 'id',
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      as: 'channel',
    });
    ChatModel.belongsTo(ChatModel, {
      foreignKey: 'parentChatId',
      targetKey: 'id',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      as: 'parentChat',
    });

    ChannelModel.init(
      {
        id: {type: Sequelize.STRING(191), allowNull: false, primaryKey: true},
        service: {type: Sequelize.STRING(191), allowNull: false},
        title: {type: Sequelize.TEXT, allowNull: true},
        url: {type: Sequelize.TEXT, allowNull: false},
        hasChanges: {type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false},
        lastVideoPublishedAt: {type: Sequelize.DATE, allowNull: true, defaultValue: null},
        lastSyncAt: {type: Sequelize.DATE, allowNull: false, defaultValue: '1970-01-01 00:00:00'},
        lastFullSyncAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: '1970-01-01 00:00:00',
        },
        syncTimeoutExpiresAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: '1970-01-01 00:00:00',
        },
        subscriptionExpiresAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: '1970-01-01 00:00:00',
        },
        subscriptionTimeoutExpiresAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: '1970-01-01 00:00:00',
        },
      },
      {
        sequelize: this.sequelize,
        modelName: 'channel',
        tableName: 'channels',
        timestamps: true,
        indexes: [
          {
            name: 'hasChanges_idx',
            fields: ['hasChanges'],
          },
          {
            name: 'lastVideoPublishedAt_idx',
            fields: ['lastVideoPublishedAt'],
          },
          {
            name: 'lastSyncAt_idx',
            fields: ['lastSyncAt'],
          },
          {
            name: 'syncTimeoutExpiresAt_idx',
            fields: ['syncTimeoutExpiresAt'],
          },
          {
            name: 'subscriptionExpiresAt_subscriptionTimeoutExpiresAt_idx',
            fields: ['subscriptionExpiresAt', 'subscriptionTimeoutExpiresAt'],
          },
        ],
      },
    );

    YtPubSubModel.init(
      {
        videoId: {type: Sequelize.STRING(191), allowNull: false, primaryKey: true},
        channelId: {type: Sequelize.STRING(191), allowNull: true, defaultValue: null},
        publishedAt: {type: Sequelize.DATE, allowNull: true, defaultValue: null},
        lastPushAt: {type: Sequelize.DATE, allowNull: false},
      },
      {
        sequelize: this.sequelize,
        modelName: 'ytPubSub',
        timestamps: true,
        updatedAt: false,
        indexes: [
          {
            name: 'lastPushAt_idx',
            fields: ['lastPushAt'],
          },
        ],
      },
    );

    ChatIdChannelIdModel.init(
      {
        chatId: {type: Sequelize.STRING(191), allowNull: false},
        channelId: {type: Sequelize.STRING(191), allowNull: false},
      },
      {
        sequelize: this.sequelize,
        modelName: 'chatIdChannelId',
        tableName: 'chatIdChannelId',
        timestamps: true,
        updatedAt: false,
        indexes: [
          {
            name: 'chatId_channelId_UNIQUE',
            unique: true,
            fields: ['chatId', 'channelId'],
          },
          {
            name: 'chatId_idx',
            fields: ['chatId'],
          },
          {
            name: 'channelId_idx',
            fields: ['channelId'],
          },
          {
            name: 'createdAt_idx',
            fields: ['createdAt'],
          },
        ],
      },
    );
    ChatIdChannelIdModel.belongsTo(ChatModel, {
      foreignKey: 'chatId',
      targetKey: 'id',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    ChatIdChannelIdModel.belongsTo(ChannelModel, {
      foreignKey: 'channelId',
      targetKey: 'id',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    VideoModel.init(
      {
        id: {type: Sequelize.STRING(191), allowNull: false, primaryKey: true},
        url: {type: Sequelize.STRING(191), allowNull: false},
        title: {type: Sequelize.STRING(191), allowNull: false},
        previews: {type: Sequelize.TEXT, allowNull: false},
        duration: {type: Sequelize.STRING(191), allowNull: true},
        channelId: {type: Sequelize.STRING(191), allowNull: false},
        publishedAt: {type: Sequelize.DATE, allowNull: false},
        telegramPreviewFileId: {type: Sequelize.TEXT, allowNull: true},
        mergedId: {type: Sequelize.STRING(191), allowNull: true},
        mergedChannelId: {type: Sequelize.STRING(191), allowNull: true},
      },
      {
        sequelize: this.sequelize,
        modelName: 'video',
        tableName: 'videos',
        timestamps: true,
        updatedAt: false,
        indexes: [
          {
            name: 'publishedAt_idx',
            fields: ['publishedAt'],
          },
        ],
      },
    );
    VideoModel.belongsTo(ChannelModel, {
      foreignKey: 'channelId',
      targetKey: 'id',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    ChatIdVideoIdModel.init(
      {
        id: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
        chatId: {type: Sequelize.STRING(191), allowNull: false},
        videoId: {type: Sequelize.STRING(191), allowNull: false},
      },
      {
        sequelize: this.sequelize,
        modelName: 'chatIdVideoId',
        tableName: 'chatIdVideoId',
        timestamps: true,
        updatedAt: false,
        indexes: [
          {
            name: 'chatId_videoId_UNIQUE',
            unique: true,
            fields: ['chatId', 'videoId'],
          },
          {
            name: 'chatId_idx',
            fields: ['chatId'],
          },
        ],
      },
    );
    ChatIdVideoIdModel.belongsTo(ChatModel, {
      foreignKey: 'chatId',
      targetKey: 'id',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    ChatIdVideoIdModel.belongsTo(VideoModel, {
      foreignKey: 'videoId',
      targetKey: 'id',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    ChatModel.hasMany(ChatIdVideoIdModel, {
      sourceKey: 'id',
      foreignKey: 'chatId',
    });
  }

  async init() {
    await this.sequelize.authenticate();
    await this.sequelize.sync();
    await this.removeChannelByIds(appConfig.channelBlackList);
  }

  async ensureChat(id: string) {
    const [model, isCreated] = await ChatModel.findOrCreate({
      where: {id},
      include: [{model: ChatModel, as: 'channel'}],
    });
    assertType<ChatModelWithOptionalChannel>(model);
    return model;
  }

  createChatChannel(chatId: string, channelId: string) {
    return this.sequelize.transaction(
      {
        isolationLevel: ISOLATION_LEVELS.REPEATABLE_READ,
      },
      async (transaction) => {
        await ChatModel.create(
          {
            id: channelId,
            parentChatId: chatId,
          },
          {
            transaction,
          },
        );
        await ChatModel.upsert(
          {
            id: chatId,
            channelId: channelId,
          },
          {
            transaction,
          },
        );
      },
    );
  }

  changeChatId(id: string, newId: string) {
    return ChatModel.update(
      {id: newId},
      {
        where: {id},
      },
    );
  }

  async getChatIds(offset: number, limit: number) {
    const chats: Pick<ChatModel, 'id'>[] = await ChatModel.findAll({
      offset,
      limit,
      attributes: ['id'],
    });
    return chats.map((chat) => chat.id);
  }

  async getChatById(id: string) {
    const chat = await ChatModel.findByPk(id);
    if (!chat) {
      throw new ErrorWithCode('Chat is not found', 'CHAT_IS_NOT_FOUND');
    }
    return chat;
  }

  getChatsByIds(ids: string[]) {
    return ChatModel.findAll({
      where: {id: ids},
    });
  }

  setChatSendTimeoutExpiresAt(ids: string[]) {
    const date = new Date();
    date.setSeconds(date.getSeconds() + appConfig.chatSendTimeoutAfterErrorMinutes * 60);
    return ChatModel.update(
      {sendTimeoutExpiresAt: date},
      {
        where: {id: ids},
      },
    );
  }

  deleteChatById(id: string) {
    return ChatModel.destroy({
      where: {id},
    });
  }

  deleteChatsByIds(ids: string[]) {
    return ChatModel.destroy({
      where: {id: ids},
    });
  }

  cleanChats() {
    return ChatModel.destroy({
      where: {
        id: {[Op.notIn]: Sequelize.literal(`(SELECT DISTINCT chatId FROM chatIdChannelId)`)},
        parentChatId: null,
      },
    });
  }

  async ensureChannel(service: ServiceInterface, rawChannel: ServiceChannel) {
    const id = serviceId.wrap(service, rawChannel.id);

    if (appConfig.channelBlackList.includes(id)) {
      throw new ErrorWithCode('Channel in black list', 'CHANNEL_IN_BLACK_LIST');
    }

    const [channel, isCreated] = await ChannelModel.findOrCreate({
      where: {id},
      defaults: Object.assign({}, rawChannel, {id, service: service.id}) as any,
    });
    return channel;
  }

  async getChatIdChannelIdChatIdCount() {
    const count = await ChatIdChannelIdModel.count({
      col: 'chatId',
      distinct: true,
    });
    return count;
  }

  async getChatIdChannelIdChannelIdCount() {
    const count = await ChatIdChannelIdModel.count({
      col: 'channelId',
      distinct: true,
    });
    return count;
  }

  async getChatIdChannelIdTop10ByServiceId(serviceId: string) {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const results = await ChatIdChannelIdModel.findAll({
      include: [
        {
          model: ChannelModel,
          required: true,
          attributes: ['title', 'service'],
          where: [
            {
              service: serviceId,
              lastVideoPublishedAt: {[Op.gt]: monthAgo},
            },
          ],
        },
      ],
      attributes: ['channelId', [Sequelize.fn('COUNT', Sequelize.col('chatId')), 'chatCount']],
      group: 'channelId',
      order: [['chatCount', 'DESC']],
      limit: 10,
    });

    return results.map((value) => {
      const {channel, ...other} = value.get({plain: true});
      return {...other, ...channel};
    });
  }

  async getChannelsByChatId(chatId: string) {
    const chatIdChannelIdList: unknown[] = await ChatIdChannelIdModel.findAll({
      include: [{model: ChannelModel, required: true}],
      where: {chatId},
      attributes: [],
      order: ['createdAt'],
    });
    assertType<{channel: ChannelModel}[]>(chatIdChannelIdList);
    return chatIdChannelIdList.map((chatIdChannelId) => chatIdChannelId.channel);
  }

  getChannelsByIds(ids: string[]) {
    return ChannelModel.findAll({
      where: {id: ids},
    });
  }

  async getChannelById(id: string) {
    const channel = await ChannelModel.findByPk(id);
    if (!channel) {
      throw new ErrorWithCode('Channel is not found', 'CHANNEL_IS_NOT_FOUND');
    }
    return channel;
  }

  getChannelCountByChatId(chatId: string) {
    return ChatIdChannelIdModel.count({
      where: {chatId},
    });
  }

  async putChatIdChannelId(chatId: string, channelId: string) {
    const [model, isCreated] = await ChatIdChannelIdModel.upsert({chatId, channelId});
    return Boolean(isCreated);
  }

  deleteChatIdChannelId(chatId: string, channelId: string) {
    return ChatIdChannelIdModel.destroy({
      where: {chatId, channelId},
    });
  }

  async getChannelIdsWithExpiresSubscription(limit = 50) {
    const date = new Date();
    date.setSeconds(
      date.getSeconds() + appConfig.updateChannelPubSubSubscribeIfExpiresLessThenMinutes * 60,
    );
    const results: Pick<ChannelModel, 'id'>[] = await ChannelModel.findAll({
      where: {
        subscriptionExpiresAt: {[Op.lt]: date},
        subscriptionTimeoutExpiresAt: {[Op.lt]: new Date()},
      },
      limit: limit,
      attributes: ['id'],
    });
    return results.map((item) => item.id);
  }

  getChannelsForSync(limit: number) {
    const date = new Date();
    date.setHours(date.getHours() - appConfig.checkChannelIfLastSyncLessThenHours);
    return ChannelModel.findAll({
      where: {
        syncTimeoutExpiresAt: {[Op.lt]: new Date()},
        [Op.or]: [{hasChanges: true}, {lastSyncAt: {[Op.lt]: date}}],
      },
      order: Sequelize.literal(`lastVideoPublishedAt IS NULL, lastSyncAt`),
      limit: limit,
    });
  }

  async getChannelIdsByServiceId(service: string, offset: number, limit: number) {
    const channels: Pick<ChannelModel, 'id'>[] = await ChannelModel.findAll({
      where: {service},
      attributes: ['id'],
      offset,
      limit,
    });
    return channels.map((channel) => channel.id);
  }

  setChannelsSyncTimeoutExpiresAtAndUncheckChanges(ids: string[]) {
    const date = new Date();
    date.setSeconds(date.getSeconds() + appConfig.channelSyncTimeoutMinutes * 60);
    return ChannelModel.update(
      {
        syncTimeoutExpiresAt: date,
        hasChanges: false,
      },
      {
        where: {id: ids},
      },
    );
  }

  setChannelsSubscriptionExpiresAt(ids: string[], expiresAt: Date) {
    return ChannelModel.update(
      {subscriptionExpiresAt: expiresAt},
      {
        where: {id: ids},
      },
    );
  }

  setChannelsSubscriptionTimeoutExpiresAt(ids: string[]) {
    const date = new Date();
    date.setSeconds(date.getSeconds() + appConfig.channelPubSubSubscribeTimeoutMinutes * 60);
    return ChannelModel.update(
      {subscriptionTimeoutExpiresAt: date},
      {
        where: {id: ids},
      },
    );
  }

  async removeChannelByIds(ids: string[]) {
    if (!ids.length) return;
    return ChannelModel.destroy({where: {id: ids}});
  }

  cleanChannels() {
    return ChannelModel.destroy({
      where: {
        id: {[Op.notIn]: Sequelize.literal(`(SELECT DISTINCT channelId FROM chatIdChannelId)`)},
      },
    });
  }

  putYtPubSub(feeds: Feed[], channelsChanges: NewChannel[], channelIds: string[]) {
    return this.sequelize.transaction(
      {
        isolationLevel: ISOLATION_LEVELS.REPEATABLE_READ,
      },
      async (transaction) => {
        await Promise.all([
          /*bulk(feeds, (feeds) => {
          return YtPubSubModel.bulkCreate(feeds, {
            updateOnDuplicate: ['channelId', 'publishedAt', 'lastPushAt'],
            transaction
          });
        }),*/
          bulk(channelsChanges, (channelsChanges) => {
            return ChannelModel.bulkCreate(channelsChanges as any, {
              updateOnDuplicate: ['lastVideoPublishedAt'],
              transaction,
            });
          }),
          ChannelModel.update(
            {
              hasChanges: true,
            },
            {
              transaction,
              where: {id: channelIds},
            },
          ),
        ]);
      },
    );
  }

  async getExistsYtPubSubVideoIds(ids: string[]) {
    const items: Pick<YtPubSubModel, 'videoId'>[] = await YtPubSubModel.findAll({
      where: {videoId: ids},
      attributes: ['videoId'],
    });
    return items.map((item) => item.videoId);
  }

  cleanYtPubSub() {
    const date = new Date();
    date.setDate(date.getDate() - appConfig.cleanPubSubFeedIfPushOlderThanDays);
    return YtPubSubModel.destroy({
      where: {
        lastPushAt: {[Op.lt]: date},
      },
    });
  }

  async getExistsVideoIds(ids: string[]) {
    const videos: Pick<VideoModel, 'id'>[] = await VideoModel.findAll({
      where: {id: ids},
      attributes: ['id'],
    });
    return videos.map((video) => video.id);
  }

  async getNoExistsVideoIds(ids: string[]) {
    const results = await this.getExistsVideoIds(ids);
    return arrayDifference(ids, results);
  }

  async getChatIdChannelIdByChannelIds(channelIds: string[]) {
    const results = await ChatIdChannelIdModel.findAll({
      where: {channelId: channelIds},
      include: [
        {
          model: ChatModel,
          attributes: ['id', 'channelId', 'isMuted', 'isSkipShortVideos'],
          required: true,
        },
      ],
    });
    assertType<
      (ChatIdChannelIdModel & {
        chat: Pick<ChatModel, 'id' | 'channelId' | 'isMuted' | 'isSkipShortVideos'>;
      })[]
    >(results);
    return results;
  }

  cleanVideos() {
    const date = new Date();
    date.setDate(date.getDate() - appConfig.cleanVideosIfPublishedOlderThanDays);
    return Promise.all([
      VideoModel.destroy({
        where: {
          publishedAt: {[Op.lt]: date},
        },
      }),
    ]);
  }

  putVideos(
    channelsChanges: NewChannel[],
    videos: NewVideo[],
    chatIdVideoIdChanges: NewChatIdVideoId[],
  ) {
    let retry = 3;

    const doTry = (): Promise<void> => {
      return this.sequelize
        .transaction(
          {
            isolationLevel: ISOLATION_LEVELS.REPEATABLE_READ,
          },
          async (transaction) => {
            await Promise.all([
              bulk(channelsChanges, (channelsChanges) => {
                return ChannelModel.bulkCreate(channelsChanges as any, {
                  updateOnDuplicate: [
                    'lastSyncAt',
                    'lastFullSyncAt',
                    'lastVideoPublishedAt',
                    'title',
                  ],
                  transaction,
                });
              }),
              bulk(videos, (videos) => {
                return VideoModel.bulkCreate(videos as any, {
                  transaction,
                });
              }),
            ]);

            await bulk(chatIdVideoIdChanges, (chatIdVideoIdChanges) => {
              return ChatIdVideoIdModel.bulkCreate(chatIdVideoIdChanges as any, {
                transaction,
              });
            });
          },
        )
        .catch((err) => {
          if (/Deadlock found when trying to get lock/.test(err.message) && --retry > 0) {
            return new Promise((r) => setTimeout(r, 250)).then(() => doTry());
          }
          throw err;
        });
    };

    return doTry();
  }

  async getDistinctChatIdVideoIdChatIds() {
    const now = new Date();
    const chats = await ChatModel.findAll({
      include: [
        {
          model: ChatIdVideoIdModel,
          required: true,
          attributes: [],
        },
      ],
      where: {
        sendTimeoutExpiresAt: {[Op.lt]: now},
      },
      attributes: ['id'],
    });
    return chats.map(({id}) => id);
  }

  async getVideoIdsByChatId(chatId: string, limit = 10) {
    const results: Pick<ChatIdVideoIdModel, 'videoId'>[] = await ChatIdVideoIdModel.findAll({
      where: {chatId},
      include: [
        {
          model: VideoModel,
          attributes: ['publishedAt'],
          required: true,
        },
      ],
      order: [Sequelize.literal('video.publishedAt')],
      attributes: ['videoId'],
      limit: limit,
    });
    assertType<(Pick<ChatIdVideoIdModel, 'videoId'> & {video: Pick<VideoModel, 'publishedAt'>})[]>(
      results,
    );
    return results.map((chatIdVideoId) => chatIdVideoId.videoId);
  }

  async getVideoWithChannelById(id: string) {
    const video = await VideoModel.findOne({
      where: {id},
      include: [{model: ChannelModel, required: true}],
    });
    if (!video) {
      throw new ErrorWithCode('Video is not found', 'VIDEO_IS_NOT_FOUND');
    }
    assertType<VideoModelWithChannel>(video);
    return video;
  }

  deleteChatIdVideoId(chatId: string, videoId: string) {
    return ChatIdVideoIdModel.destroy({
      where: {chatId, videoId},
    });
  }

// List all groups
async listGroups(): Promise<{ name: string; telegram_channel_id: string }[]> {
  const rows = await this.sequelize.query(
    'SELECT name, telegram_channel_id FROM groups',
    { type: QueryTypes.SELECT }
  );
  return rows as { name: string; telegram_channel_id: string }[];
}


// Remove group by telegram_channel_id
async removeGroupByChannelId(telegram_channel_id: string): Promise<void> {
  await this.sequelize.query(
    'DELETE FROM groups WHERE telegram_channel_id = ?',
    { replacements: [telegram_channel_id], type: QueryTypes.DELETE }
  );
}

// Fetch group by telegram_channel_id
async getGroupByChannelId(telegram_channel_id: string): Promise<any> {
  const rows = await this.sequelize.query(
    'SELECT * FROM groups WHERE telegram_channel_id = ?',
    { replacements: [telegram_channel_id], type: QueryTypes.SELECT }
  );
  return (rows as any[])[0] || null;
}


  // --- GROUP METHODS MUST BE INSIDE THE CLASS! ---
  async groupExists(name: string): Promise<boolean> {
    const rows = await this.sequelize.query(
      'SELECT id FROM groups WHERE name = ?',
      { replacements: [name], type: Sequelize.QueryTypes.SELECT }
    );
    // 'rows' is usually an array, but can be a tuple depending on dialect, safest to coerce
    return (rows as any[]).length > 0;
  }

  async addGroup(name: string, telegram_channel_id: string): Promise<void> {
    await this.sequelize.query(
      'INSERT INTO groups (name, telegram_channel_id) VALUES (?, ?)',
      { replacements: [name, telegram_channel_id], type: Sequelize.QueryTypes.INSERT }
    );
  }

  async getGroupByName(name: string): Promise<any> {
    const rows = await this.sequelize.query(
      'SELECT * FROM groups WHERE name = ?',
      { replacements: [name], type: Sequelize.QueryTypes.SELECT }
    );
    return (rows as any[])[0] || null;
  }
} // <--- THIS is the end of the class Db

function bulk<T, F>(results: T[], callback: (results: T[]) => F): Promise<F[]> {
  const resultsParts = arrayByPart(results, 100);
  return Promise.all(resultsParts.map((results) => callback(results)));
}

function dateToSql(date: Date) {
  const [YYYY, MM, DD, HH, mm, ss] = [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  ].map((v) => (v < 10 ? '0' : '') + v);
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
}

export default Db;