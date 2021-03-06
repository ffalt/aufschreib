# aufschreib

##Purpose

This is my playground for learning to use *node js* as a server and build svg charts with *d3*. It's not tested on production server, so be warned.
  
*What it should do:*

a) A node js http server for classifying tweets by humans in a browser.

b) With these classifications train a [Bayesian classifier](http://en.wikipedia.org/wiki/Bayesian_spam_filtering).

c) Produce some statistical representations based on it.

*And why?*

In January/February 2013  (mostly german speaking) women on Twitter started to post personal stories of experienced sexism and harassment under the hashtag #aufschrei (#outcry).
Soon many more people where using the hashtag to post opinions, links, troll comments, spam. I want to analyze this large amount of tweets and maybe contribute the results (if any usefull) to the [aufschreiStat](https://github.com/lenaschimmel/aufschreiStat/) project. 


##Current state in words

The result data is NOT RELIABLE! yet.

[TODO-List](https://github.com/ffalt/aufschreib/tree/master/TODO.md)

##Current state in pictures

[See yourself](https://github.com/ffalt/aufschreib/tree/master/pics)

 
##Requirements

[http://nodejs.org/](http://nodejs.org/)
[http://bower.io/](http://bower.io/)
[http://www.mongodb.org/](http://www.mongodb.org/)

run `npm install` in root folder to install the required node.js-packages
run `bower install` in `/static/` to install the required client side js-packages


##Usage

### 0. Prepare Config File

Copy **"config.dist.js"** and rename it to **"config.js"**

now change the connection details to your settings

	const mongo_settings = {
		"hostname": "localhost",
		"port": 27017,
		"username": "aufschreib",
		"password": "ohsosecret",
		"name": "aufschreib",
		"db": "aufschreib"
	};


### 2. Prepare

Put your base JSON file named **"tweets.json"** into the **/data/** folder

used format of a tweet must be the same twitter uses

	[
	{
		"created_at": "Thu, 31 Jan 2013 18:22:47 +0000",
		"id_str": "297047589672343473",
		"source": "&lt;a href=&quot;http://client.url/&quot;&gt;Client&lt;/a&gt;",
		"text": "Some Tweet text with #hashtags, @usernames and http/https-links",
		"user": {
			"profile_image_url": "http://a0.twimg.com/profile_images/nr/some.png",
			"screen_name": "TwitterUser"
		}
	},
    ...
    ]

or implement another in file **"prepare.js"**


### 3. Edit Categories (optional)

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

if you edit the categories you need to set the parameter for the Bayesian filter, too.

'Specify the classification thresholds for each category. To classify an item in a category with a threshold of x the probably that item is in the category has to be more than x times the probability that it's in any other category. Default value is 1.'
[Source](https://npmjs.org/package/classifier)

	const thresholds = {
		spam: 3,
		troll: 2,
		report: 2,
		comment: 1,
		outcry: 1
	};

### 3. Longify Urls (optional)

run in `\bin`

`node "longifyurls.js"`

expand twitters short urls (t.co) through [http://www.longurlplease.com/](http://www.longurlplease.com/)
expanded urls will then be checked for other short urls services, too.

a file **"urls.json"** with the expanded urls will be created and used

### 4. Prepare Script (mandatory!)

run in `\bin`

`node "prepare.js"`

collections are created and data is filled
aaaaaaandddddd wait until the process finishes

### 5. Server

We're nearly there

Edit **"config.js"** if you want to change where to access the server

	const server_settings = {
		listento: '0.0.0.0',
		port: 8081
	};

now run

`node "app.js"`

and open the adress with your browser 

e.g. **http://localhost:8081/**

default username is: **admin**

password is: **totalsupergehaim**

Happy classifing!
