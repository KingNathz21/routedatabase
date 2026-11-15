-- Add properly attributed, multi-image galleries for the first five indexed routes.
-- Images are hosted by Wikimedia Commons and remain linked to their source and licence.
UPDATE routes
SET raw_json = json_set(raw_json, '$.Images', json('[
  {"src":"https://upload.wikimedia.org/wikipedia/commons/9/9b/LC67_AHO%2C_Park_Lane%2C_May_16th_2025.jpg","alt":"Arriva London route 2 bus on Park Lane, May 2025","credit":"Southsea_Matt","source":"https://commons.wikimedia.org/wiki/File:LC67_AHO,_Park_Lane,_May_16th_2025.jpg","license":"https://creativecommons.org/licenses/by-sa/4.0/","licenseLabel":"CC BY-SA 4.0"},
  {"src":"https://upload.wikimedia.org/wikipedia/commons/9/9f/LC67_AJX%2C_Hyde_Park_Lane%2C_May_16th_2025.jpg","alt":"Arriva London route 2 bus at Hyde Park Lane, May 2025","credit":"Southsea_Matt","source":"https://commons.wikimedia.org/wiki/File:LC67_AJX,_Hyde_Park_Lane,_May_16th_2025.jpg","license":"https://creativecommons.org/licenses/by-sa/4.0/","licenseLabel":"CC BY-SA 4.0"}
]'))
WHERE route_number = '2' AND status = 'current';

UPDATE routes
SET raw_json = json_set(raw_json, '$.Images', json('[
  {"src":"https://upload.wikimedia.org/wikipedia/commons/d/d1/2419_Abellio_-_Flickr_-_antoniovera1.jpg","alt":"Abellio London route 3 bus, fleet 2419","credit":"Antonio Vera","source":"https://commons.wikimedia.org/wiki/File:2419_Abellio_-_Flickr_-_antoniovera1.jpg","license":"https://creativecommons.org/licenses/by-sa/2.0/","licenseLabel":"CC BY-SA 2.0"},
  {"src":"https://upload.wikimedia.org/wikipedia/commons/1/15/Abellio_London_2434_on_Route_3%2C_Piccadilly_Circus.jpg","alt":"Abellio London route 3 bus at Piccadilly Circus","credit":"Au Morandarte","source":"https://commons.wikimedia.org/wiki/File:Abellio_London_2434_on_Route_3,_Piccadilly_Circus.jpg","license":"https://creativecommons.org/licenses/by-sa/2.0/","licenseLabel":"CC BY-SA 2.0"}
]'))
WHERE route_number = '3' AND status = 'current';

UPDATE routes
SET raw_json = json_set(raw_json, '$.Images', json('[
  {"src":"https://upload.wikimedia.org/wikipedia/commons/b/b5/Metroline_bus_VW1270_%28LK12_AHA%29%2C_14_January_2014.jpg","alt":"Metroline route 4 bus heading to Waterloo","credit":"Au Morandarte","source":"https://commons.wikimedia.org/wiki/File:Metroline_bus_VW1270_(LK12_AHA),_14_January_2014.jpg","license":"https://creativecommons.org/licenses/by-sa/2.0/","licenseLabel":"CC BY-SA 2.0"},
  {"src":"https://upload.wikimedia.org/wikipedia/commons/c/c8/LK03CFJ_%2814279777463%29.jpg","alt":"Metroline route 4 bus at Archway","credit":"MANHATTAN RESEARCH INC","source":"https://commons.wikimedia.org/wiki/File:LK03CFJ_(14279777463).jpg","license":"https://creativecommons.org/licenses/by/2.0/","licenseLabel":"CC BY 2.0"}
]'))
WHERE route_number = '4' AND status = 'current';

UPDATE routes
SET raw_json = json_set(raw_json, '$.Images', json('[
  {"src":"https://upload.wikimedia.org/wikipedia/commons/9/9b/Au_Morandarte_Flickr_Stagecoach_19783_on_Route_5%2C_Barking_Station_%289696936237%29.jpg","alt":"Stagecoach route 5 bus at Barking Station","credit":"Au Morandarte","source":"https://commons.wikimedia.org/wiki/File:Au_Morandarte_Flickr_Stagecoach_19783_on_Route_5,_Barking_Station_(9696936237).jpg","license":"https://creativecommons.org/licenses/by-sa/2.0/","licenseLabel":"CC BY-SA 2.0"},
  {"src":"https://upload.wikimedia.org/wikipedia/commons/6/67/East_London_bus_17859_%28LX03_NFD%29%2C_8_May_2013.jpg","alt":"East London route 5 bus, fleet 17859","credit":"David McKay","source":"https://commons.wikimedia.org/wiki/File:East_London_bus_17859_(LX03_NFD),_8_May_2013.jpg","license":"https://creativecommons.org/licenses/by/2.0/","licenseLabel":"CC BY 2.0"}
]'))
WHERE route_number = '5' AND status = 'current';

UPDATE routes
SET raw_json = json_set(raw_json, '$.Images', json('[
  {"src":"https://upload.wikimedia.org/wikipedia/commons/1/12/Au_Morandarte_Flickr_Metroline_VP524_on_Route_6%2C_Aldwych_%289565162518%29.jpg","alt":"Metroline route 6 bus at Aldwych","credit":"Au Morandarte","source":"https://commons.wikimedia.org/wiki/File:Au_Morandarte_Flickr_Metroline_VP524_on_Route_6,_Aldwych_(9565162518).jpg","license":"https://creativecommons.org/licenses/by-sa/2.0/","licenseLabel":"CC BY-SA 2.0"},
  {"src":"https://upload.wikimedia.org/wikipedia/commons/b/bc/TFL_bus_route_6_on_Oxford_Street.jpg","alt":"Metroline route 6 bus on Oxford Street","credit":"Dannebrog Spy","source":"https://commons.wikimedia.org/wiki/File:TFL_bus_route_6_on_Oxford_Street.jpg","license":"https://creativecommons.org/licenses/by-sa/4.0/","licenseLabel":"CC BY-SA 4.0"}
]'))
WHERE route_number = '6' AND status = 'current';
