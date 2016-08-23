var express = require('express');
var router = express.Router();
var knex = require('../db/knex');
var Promise = require('bluebird');
var helpers = require('../lib/helpers');

function Authors() {
  return knex('authors');
}

function Books() {
  return knex('books');
}

function Authors_Books() {
  return knex('authors_books');
}


router.get('/', function(req, res, next) {

		var arr = [];
		Authors().then(function(authors){
		for (var i = 0; i < authors.length; i++) {
			arr.push(Authors().pluck('id').where('id', authors[i].id).then(function(all){
				return Authors_Books().whereIn('author_id', all).pluck('book_id').then(function(books){
				return Books().whereIn('id', books).then(function(bookName){
						return bookName;
					})
				})
			}))
		}
		Promise.all(arr).then(function(data){
			var result = authors.map(function(val, i){
				val.books = data[i];
				return val;
			})
			res.render('authors/index', {authors: result})
		})
	})
});

router.get('/new', function(req, res, next) {
  Books().select().then(function (books) {
    res.render('authors/new', {books: books});
  })
});

router.post('/', function (req, res, next) {
  var bookIds = req.body.book_ids.split(",");
  delete req.body.book_ids;
  Authors().returning('id').insert(req.body).then(function (id) {
    helpers.insertIntoAuthorsBooks(bookIds, id[0]).then(function () {
      res.redirect('/authors');
    })
  })
});

router.get('/:id/delete', function (req, res, next) {
  Authors().where('id', req.params.id).first().then(function (author) {
    helpers.getAuthorBooks(req.params.id).then(function (authorBooks) {
      Books().select().then(function (books) {
        res.render('authors/delete', {author: author, author_books: authorBooks, books: books });
      })
    })
  })
})

router.post('/:id/delete', function (req, res, next) {
  Promise.all([
    Authors().where('id', req.params.id).del(),
    Authors_Books().where('author_id', req.params.id).del()
  ]).then(function (results) {
    res.redirect('/authors')
  })
})

router.get('/:id/edit', function (req, res, next) {

	var promises = [];
	promises.push(Authors().where({id: req.params.id}).first())
	promises.push(Authors_Books().join('books', 'books.id', '=', 'authors_books.book_id').where({'authors_books.author_id': req.params.id}).then(function(books){
		return books
	}))
	Promise.all(promises).then(function(data){
		res.render('authors/edit', {author: data[0],author_books: data[1]})
	})
})

router.post('/:id', function (req, res, next) {
  var bookIds = req.body.book_ids.split(",");
  delete req.body.book_ids;
  Authors().returning('id').where('id', req.params.id).update(req.body).then(function (id) {
    id = id[0];
    helpers.insertIntoAuthorsBooks(bookIds, id).then(function () {
    res.redirect('/authors');
    });
  })
})

router.get('/:id', function (req, res, next) {
	var promises = [];
	promises.push(Authors().where({id: req.params.id}).first())
	promises.push(Authors_Books().join('books', 'books.id', '=', 'authors_books.book_id').where({'authors_books.author_id': req.params.id}).then(function(books){
		return books
	}))
	Promise.all(promises).then(function(data){

		res.render('authors/show', {author: data[0],books: data[1]})
	})
})

module.exports = router;
