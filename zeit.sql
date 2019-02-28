DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(20) NOT NULL,
  `twitter` varchar(15) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;

LOCK TABLES `users` WRITE;

INSERT INTO `users` VALUES
  (null,'Guillermo Rauch','rauchg'),
  (null,'Naoyuki Kanezawa','nkzawa'),
  (null,'Olli Vanhoja','OVanhoja'),
  (null,'Evil Rabbit','evilrabbit_'),
  (null,'Leo Lamprecht','notquiteleo'),
  (null,'Igor Klopov','iklopov'),
  (null,'Nathan Rajlich','tootallnate'),
  (null,'Arunoda Susiripala','arunoda'),
  (null,'Matheus Fernandes','matheusfrndes'),
  (null,'Javi Velasco','javivelasco'),
  (null,'Tim Neutkens','timneutkens'),
  (null,'Timothy Lorimer','timothyis_'),
  (null,'Shu Ding','quietshu'),
  (null,'Max Rovensky','MaxRovensky'),
  (null,'Harrison Harnisch','hjharnis'),
  (null,'Connor Davis','connordav_is');

UNLOCK TABLES;
