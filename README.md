# aufschreib

##Purpose

This is my playground for learning using *node js* as a server and building svg charts with *d3*. It's not tested on production server, so be warned.
  
*What it should do:*

a) A node js http server for classifying tweets by humans in a browser.

b) With these classifications train a [Bayesian classifier](http://en.wikipedia.org/wiki/Bayesian_spam_filtering).

c) Produce some statistical representations based on it.

*And why?*

In February 2013  (mostly german speaking) women on Twitter started to post personal stories of experienced sexism and harassment under the hashtag #aufschrei (#outcry).
Soon many more people where using the hashtag to post opinions, links, troll comments, spam. I want to analyze this large amount of tweets and maybe contribute the results (if any usefull) to the [aufschreiStat](https://github.com/lenaschimmel/aufschreiStat/) project. 


##Current state in words

The result data is NOT RELIABLE! yet.
[TODO-List](https://github.com/ffalt/aufschreib/tree/master/TODO.md)

##Current state in pictures

[See yourself](https://github.com/ffalt/aufschreib/tree/master/pics)

 
##Requirements

[http://nodejs.org/](http://nodejs.org/)


optional: a mysql database


modules for node js

	npm install classifier
	npm install ejs
	npm install express
	npm install fetch
	npm install moment
	npm install passport
	npm install passport-local
	npm install resolver

optional

	npm install mysql

##Usage

### 1. Choose your storage
**1.1 File-based storage**

Edit **"consts.js"** and set

	const usedb = false;

**1.2 *OR* mysql-based storage**

Edit **"consts.js"** and set

	const usedb = true;
 

now enter the connection details to **"tweets_mysql.js"**

	var dboptions = {
		host: 'localhost',
		user: 'aufschreib',
		password: 'ohsosecret',
		database: 'aufschreib',
		supportBigNumbers: true,
		debug: false,
		connectionLimit: 100
	};`

### 2. Prepare

Put your base JSON file named **"messages.json"** into the **/data/** folder

the used format of a tweet is 

	[
	{
		"created_at": "Thu, 31 Jan 2013 18:22:47 +0000",
		"id": "297047589672343473",
		"source": "&lt;a href=&quot;http://client.url/&quot;&gt;Client&lt;/a&gt;",
		"text": "Some Tweet text with #hashtags, @usernames and http/https-links",
		"user": {
			"profile_image_url": "http://a0.twimg.com/profile_images/nr/some.png",
			"screen_name": "TwitterUser"
		}
	},
    ...
    ]

or implement another in file **"1 prepare.js"**


### 3. Choose Categories

Edit **"consts.js"**

	const cats = [
	{
		id: 'outcry',
		name: 'Aufschrei',
		icon: 'icon-bullhorn',
		color: '#5e8c6A'
	},
	...
	];    

### 4. Prepare Script

Edit **"1 prepare.js"**

	var longifylinks = false;

if you want to disable support for retrieveing expanded links from short link services like twitters t.co
otherwise urls will be expanded through [http://www.longurlplease.com/](http://www.longurlplease.com/)


now run

`node "1 prepare.js"`

if you use longifylinks, a file "**urls.json**" the expanded urls will be created

if you use mysql, tables are created and data is filled

if you use files, files are created

aaaaaaandddddd wait  

### 5. Server

We're nearly there

Edit "**app.js**" if you want to change where to access the server

	var listento = '0.0.0.0', 
    	port = 8081;

now run

`node "app.js"`

and open the adress with your browser 

e.g. **http://http://localhost:8081/**

Happy classifing!
