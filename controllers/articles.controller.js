const { articlesModel } = require("../models");
const isTest = process.env.NODE_ENV === "test";

exports.getArticles = async (req, res, next) => {
  const { topic, sort_by, order, limit, page } = req.query;
  try {
    const articles = await articlesModel.selectAllArticles(
      topic,
      sort_by,
      order,
      limit,
      page
    );
    res.status(200).send({ articles });
  } catch (err) {
    next(err);
  }
};

exports.postArticle = async (req, res, next) => {
  try {
    if (!isTest) {
      if (!req.user) {
        throw {
          status: 401,
          msg: "You must be logged in to post an article.",
        };
      }
    }

    const { newArticle } = req.body;
    if (!newArticle) {
      return res.status(400).send({ status: 400, msg: "Bad Request" });
    }
    const insertedArticle = await articlesModel.insertArticle(newArticle);
    res.status(200).send({ insertedArticle });
  } catch (err) {
    next(err);
  }
};

exports.getArticleById = async (req, res, next) => {
  try {
    const { article_id } = req.params;
    const article = await articlesModel.selectArticleById(article_id);
    res.status(200).send({ article });
  } catch (err) {
    next(err);
  }
};

exports.patchArticleById = async (req, res, next) => {
  try {
    if (!isTest) {
      if (!req.user) {
        throw {
          status: 401,
          msg: "You must be logged in to edit this article.",
        };
      }
    }

    const { article_id } = req.params;
    const { inc_votes } = req.body;
    const updatedArticle = await articlesModel.updateArticleById(
      article_id,
      inc_votes
    );
    res.status(200).send({ updatedArticle });
  } catch (err) {
    next(err);
  }
};

exports.removeArticleById = async (req, res, next) => {
  try {
    if (!isTest) {
      if (!req.user) {
        throw {
          status: 401,
          msg: "You must be logged in to delete this article.",
        };
      }
    }

    const { article_id } = req.params;
    await articlesModel.deleteArticleById(article_id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.getArticleCommentsById = async (req, res, next) => {
  try {
    const { article_id } = req.params;
    const { limit, page } = req.query;
    const comments = await articlesModel.selectArticleCommentsById(
      article_id,
      limit,
      page
    );
    res.status(200).send({ comments });
  } catch (err) {
    next(err);
  }
};

exports.postArticleCommentById = async (req, res, next) => {
  try {
    if (!isTest) {
      if (!req.user) {
        throw {
          status: 401,
          msg: "You must be logged in to edit this article.",
        };
      }
    }

    const { article_id } = req.params;
    const { username, body } = req.body;
    const postedComment = await articlesModel.insertArticleCommentById(
      article_id,
      username,
      body
    );

    res.status(200).send({ postedComment });
  } catch (err) {
    next(err);
  }
};
