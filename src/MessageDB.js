import * as firebase from 'firebase';
import uuid from 'js-uuid';
import config, {constant} from './config/default';
import distance from './Distance';
import { light } from '@material-ui/core/styles/createPalette';
import { getStreetAddressFromGeoLocation} from './Location';

function tagsToTagfilter(tags) {
        let rv = {};
        if(tags != null && tags.length > 0) {
            tags.map((tag) => {
                rv[tag] = 1;
            });
        }
        return rv;
}

function tagfilterToTags(tagfilter) {
    let rv = [];
    if(tagfilter != null) {
        for(let key in tagfilter) {
            rv.push(key);
        }
    }
    return rv;
}

function degreesToRadians(degrees) {return (degrees * Math.PI)/180;}

function metersToLongitudeDegrees(distance, latitude) {
    const EARTH_EQ_RADIUS = 6378137.0;
    // this is a super, fancy magic number that the GeoFire lib can explain (maybe)
    const E2 = 0.00669447819799;
    const EPSILON = 1e-12;
    const radians = degreesToRadians(latitude);
    const num = Math.cos(radians) * EARTH_EQ_RADIUS * Math.PI / 180;
    const denom = 1 / Math.sqrt(1 - E2 * Math.sin(radians) * Math.sin(radians));
    const deltaDeg = num * denom;
    if (deltaDeg < EPSILON) {
      return distance > 0 ? 360 : 0;
    }
    // else
    return Math.min(360, distance / deltaDeg);
}

function wrapLongitude(longitude) {
    if (longitude <= 180 && longitude >= -180) {
        return longitude;
    }
    const adjusted = longitude + 180;
    if (adjusted > 0) {
        return (adjusted % 360) - 180;
    }
    // else
    return 180 - (-adjusted % 360);
}

function upgradeAllMessage() {
    const db = firebase.firestore();
    let collectionRef = db.collection(config.messageDB);
    collectionRef.onSnapshot(function() {})  
    collectionRef.get().then(function(querySnapshot) {
        if(querySnapshot.empty) {
            return
        } else { 
            querySnapshot.forEach(function(messageRef) {
                var val = messageRef.data();
                if(val) {
                    let changeCreatedAt = false;
                    let change = false;
                    let before =  val.createdAt;
                    try {
                        let createdAt = val.createdAt.toDate();
                    } catch(error) {
                        changeCreatedAt = true;
                    };
                    if(val.tag != null) {
                        change = true;
                        if(!val.tag.includes("公共設施")) {
                            if(val.tag.includes("兒童遊樂場") || val.tag.includes("郵箱") || val.tag.includes("郵筒")) {
                                val.tag.push("公共設施");
                            }
                        }
                    }
                    if(val.tagfilter != null) {
                        let tags = tagfilterToTags(val.tagfilter);
                        if(!tags.includes("公共設施")) {
                            if(tags.includes("兒童遊樂場") || tags.includes("郵箱") || tags.includes("郵筒")) {
                                tags.push("公共設施");
                            }
                        }
                        val.tagfilter = tagsToTagfilter(tags);
                        change = true;    
                    }
                    if(changeCreatedAt) {
                        change = true;
                        val.createdAt = new Date(val.createdAt);
                        //console.log(`Update: ${val.key} ${before} ${val.createdAt}`)
                    }
                    if(val.lastUpdate == null) {
                        change = true;
                        val.lastUpdate = val.createdAt;
                    }
                    if(val.streetAddress == null) {
                        change = false;
                        return getStreetAddressFromGeoLocation(val.geolocation, function(err, response){
                            if (!err) {
                                console.log(response.json.results);
                                val.streetAddress = response.json.results[0].formatted_address;
                                return updateMessage(val.key, val, false);
                              }
                        }, null);
                    }
                    
                    if(change) {
                        return updateMessage(val.key, val, false);
                    } else {
                        return;
                    }
                }                
            });
        }
    })         
}

function fetchMessagesBaseOnGeo(geocode, radius, numberOfMessage, lastUpdate, tag, callback) {

    const db = firebase.firestore();
    
    
    let collectionRef = db.collection(config.messageDB);
    collectionRef.onSnapshot(function() {})         
    if(geocode != null && geocode != NaN && geocode.latitude != undefined) {
//        console.log("Get message base on Location: (" + geocode.latitude + " ," + geocode.longitude + ") with Radius: " + radius);
//        boundingBoxCoordinates(center, radius) {
            const KM_PER_DEGREE_LATITUDE = 110.574;
            const latDegrees = radius / KM_PER_DEGREE_LATITUDE;
            const latitudeNorth = Math.min(90, geocode.latitude + latDegrees);
            const latitudeSouth = Math.max(-90, geocode.latitude - latDegrees);
//            console.log(latitudeSouth + ' ' + geocode.latitude + ' ' + latDegrees);
            // calculate longitude based on current latitude
            const longDegsNorth = metersToLongitudeDegrees(radius, latitudeNorth);
            const longDegsSouth = metersToLongitudeDegrees(radius, latitudeSouth);
            const longDegs = Math.max(longDegsNorth, longDegsSouth);

        let lesserGeopoint = new firebase.firestore.GeoPoint(latitudeSouth, wrapLongitude(geocode.longitude - longDegs));
        let greaterGeopoint = new firebase.firestore.GeoPoint(latitudeNorth, wrapLongitude(geocode.longitude + longDegs));

        // Use firestore

        let query = null;
        if(tag != null) {
            query = collectionRef.where(`tagfilter.${tag}`, ">" , 0);
        } else {
            query = collectionRef.where("hide", "==", false);
            if(lastUpdate != null) {
            console.log("Last Update: " + lastUpdate.toDate());
            query = query.where("lastUpdate", ">", lastUpdate).orderBy("lastUpdate", "desc");
            } else {
                    query = query.where("geolocation", ">=", lesserGeopoint).where("geolocation", "<=", greaterGeopoint).orderBy("geolocation", "desc");
            }      
        }
        query.limit(numberOfMessage).get().then(function(querySnapshot) {
            if(querySnapshot.empty) {
                callback(null);
            } else { 
                querySnapshot.forEach(function(messageRef) {
                    var val = messageRef.data();
                    if(val) {
                        var lon = geocode.longitude;
                        var lat = geocode.latitude;
                        var dis = distance(val.geolocation.longitude,val.geolocation.latitude,lon,lat);
                        if(dis < radius && val.hide == false) {
                            let tags = tagfilterToTags(val.tagfilter);
                            //console.log(`${tags} ${val.tagfilter}`)
                            val.tag = tags;
                            val.tagfilter = null;
                            //console.log('message key: ' + val.key );
                            callback(val); 
                        } else {
                            callback(null);
                        }
                    }
                    
                });
            }
        })
        .catch(function(error) {
            console.log("Error getting documents: ", error);
        });
/*        collectionRef.where("hide", "==", false).where("geolocation", ">=", lesserGeopoint).where("geolocation", "<=", greaterGeopoint).onSnapshot(function(querySnapshot) {
            querySnapshot.forEach(callback);
        })       */
    } else {
        // Use firestore
        collectionRef.where("hide", "==", false).orderBy("createdAt", "desc").limit(numberOfMessage).get().then(function(querySnapshot) {
            querySnapshot.forEach(function(messageRef) {let val = messageRef.data(); callback(val)});
        })
        .catch(function(error) {
            console.log("Error getting documents: ", error);
        });
/*        collectionRef.where("hide", "==", false).onSnapshot(function(querySnapshot) {
            querySnapshot.forEach(callback);
        })  */     
    }
 }

 function addMessage(key, message, currentUser, userProfile, tags, geolocation, streetAddress, startDate, duration, interval, startTime, everydayOpenning, weekdaysOpennings, endDate, link, imageUrl, publicImageURL, thumbnailImageURL, thumbnailPublicImageURL, status) {
    let now = Date.now();
    if(startDate === null)
    {
      duration = null;
      interval = null;
    }
    let photoUrl = currentUser.providerData[0].photoURL;
    let displayName = currentUser.displayName;

    if(userProfile !=null) {
        if(userProfile.photoURL != null) {
            photoUrl = userProfile.photoURL;
        }
        if(userProfile.displayName != null) {
            displayName = userProfile.displayName;
        }
    }
    let tagfilter = tagsToTagfilter(tags);
    var messageRecord = {
        hide: false,
        name: displayName,
        text: message,
        photoUrl: photoUrl || '/images/profile_placeholder.png',
        geolocation: new firebase.firestore.GeoPoint(geolocation.latitude, geolocation.longitude),
        streetAddress: streetAddress,
        tagfilter: tagfilter,
        createdAt: new Date(now),
        lastUpdate: new Date(now),
        key: key,   
        uid: currentUser.uid,
        fbuid: currentUser.providerData[0].uid,
        start: new Date(startDate),
        startTime: startTime,
        duration: duration,
        interval: interval,
        everydayOpenning: everydayOpenning,
        weekdaysOpennings: weekdaysOpennings,
        endDate: endDate, 
        link: link,
        imageUrl, publicImageURL, 
        thumbnailImageURL, 
        thumbnailPublicImageURL,
        status: status,
        viewCount: 0,
      };
    // Use firestore
    const db = firebase.firestore();
    
    
    const messageRef = db.collection(config.messageDB).doc(key);
    const userRef = db.collection(config.userDB).doc(currentUser.uid);
    return db.runTransaction(transaction => {
      return transaction.get(userRef).then(userDoc => {
        let publishMessages = userDoc.data().publishMessages;
        if (publishMessages == null) {
          publishMessages = [key]
        } else {
          publishMessages.push(key);
        }
        transaction.set(messageRef, messageRecord);
        transaction.update(userRef, {
          publishMessages: publishMessages,
          publishMessagesCount: publishMessages.length,
        });
        console.log("Document written with ID: ", key);
        return (key);
      });
    });
};

function dropMessage(key) {
    // Drop comment
    // Drop message
    // Drop publishMessages and reduce
    return getMessage(key).then(function(message) {
        if(message != null) {
            const uid = message.uid;
            var storage = firebase.storage();
            if(message.imageUrl != null) {
                console.log("Document image: " + message.imageUrl);
                storage.refFromURL(message.imageUrl).delete();
            }
            if(message.thumbnailImageURL != null) {
                console.log("Document thumbnail image: " + message.imageUrl);
                storage.refFromURL(message.thumbnailImageURL).delete();
            }
            const db = firebase.firestore();
            
            
            var messageRef = db.collection(config.messageDB).doc(key);
            var userRef = db.collection(config.userDB).doc(uid);
            var commentRef = messageRef.collection(config.commentDB);
            return commentRef.get().then(function(querySnapshot) {
                var batch = db.batch();
                querySnapshot.forEach(function(doc) {
                    var ref = commentRef.doc(doc.id);
                    batch.delete(ref);
                });
                return batch.commit().then(function() {
                    return db.runTransaction(transaction => {
                        return transaction.get(userRef).then(userDoc => {
                            let publishMessages = userDoc.data().publishMessages;
                            if (publishMessages != null) {
                                var index = publishMessages.indexOf(key);
                                if (index !== -1) publishMessages.splice(index, 1);
                            }
                            transaction.delete(messageRef);
                            transaction.update(userRef, {
                                publishMessages: publishMessages,
                                publishMessagesCount: publishMessages.length,
                                });
                            console.log("Document written with ID: ", key);
                            return true;
                        });
                    });    
                });
            });            
        } else {
            return false;
        }
    });
}
  
function getMessageRef(uuid) {
    // firestore
    // Use firestore
    var db = firebase.firestore();
    var collectionRef = db.collection(config.messageDB);
    var docRef = collectionRef.doc(uuid);
    return docRef.get().then(function(doc) {
        if (doc.exists) {
            return(doc);
        } else {
            return null;
        }
    });     
}

function getMessage(uuid) {
    return getMessageRef(uuid).then(function (messageRef) {
        if(messageRef != null) {
            let rv = messageRef.data();
            if(rv.tagfilter != null) {
                let tags = tagfilterToTags(rv.tagfilter);
                //console.log(`${tags} ${rv.tagfilter}`)
                rv.tag = tags;
                rv.tagfilter = null;
            }
            return rv
        } else {
            return null;
        }
    });
}

function updateMessage(messageKey, messageRecord, updateTime) {
    var db = firebase.firestore();
    
    
    var now = Date.now();
    var collectionRef = db.collection(config.messageDB);
    if(messageRecord == null) {
        if(updateTime) {
            return collectionRef.doc(messageKey).update({
                lastUpdate: new Date(now)
            }).then(function(messageRecordRef) {
                console.log("Document written with ID: ", messageKey);
                return(messageRecordRef);
            }) 
        }
    } else {
        // we can use this to update the scheme if needed.
        if(updateTime) {
            messageRecord.lastUpdate = new Date(now);
        }
        if(messageRecord.tagfilter == null && messageRecord.tag != null) {
            let tagfilter = tagsToTagfilter(messageRecord.tag);
            messageRecord.tagfilter = tagfilter;
            messageRecord.tag = null;
        }
        return collectionRef.doc(messageKey).set(messageRecord).then(function(messageRecordRef) {
            console.log("Document written with ID: ", messageKey);
            return(messageRecordRef);
        })      
    }
}

function incMessageViewCount(messageKey) {
    return getMessageRef(messageKey).then(function (messageRef) {
        if(messageRef != null) {
            let viewCount = 1;
            if(messageRef.data().viewCount != null) {
                viewCount = messageRef.data().viewCount + 1;
            }
            const db = firebase.firestore();
            let collectionRef = db.collection(config.messageDB);
            let docRef = collectionRef.doc(messageKey);
            return docRef.update({viewCount: viewCount});
        } else {
            return null;
        }
    });
}



function updateMessageImageURL(messageKey, imageURL, publicImageURL, thumbnailImageURL, thumbnailPublicImageURL) {
    return getMessage(messageKey).then((messageRecord) => {
        if(imageURL != messageRecord.imageUrl) {
            messageRecord.imageUrl = imageURL;
        }
        if(publicImageURL != messageRecord.publicImageURL) {
            messageRecord.publicImageURL = publicImageURL;
        } 
        if(thumbnailImageURL != messageRecord.thumbnailImageURL) {
            messageRecord.thumbnailImageURL = thumbnailImageURL;
        }
        if(thumbnailPublicImageURL != messageRecord.thumbnailPublicImageURL) {
            messageRecord.thumbnailPublicImageURL = thumbnailPublicImageURL;
        }       
        return updateMessage(messageKey, messageRecord, true);
    });
}

function updateMessageConcernUser(messageUuid, user, isConcern) {
    // Use firestore
    return getMessage(messageUuid).then((messageRecord) => {
        if(messageRecord != null) {
            if(messageRecord.concernRecord != null)
            {
                var index = messageRecord.concernRecord.indexOf(user.uid);
                if(index == -1 && isConcern)
                {
                    messageRecord.concernRecord.push(user.uid);
                    return updateMessage(messageUuid, messageRecord, false);
                }
                else
                {
                    if(!isConcern) {
                        messageRecord.concernRecord.splice(index, 1);
                        return updateMessage(messageUuid, messageRecord, false);
                    }
                }
            } else {
                if(isConcern)
                {
                    console.log("message Uuid " + messageUuid + " User Id " + user.uid)
                    messageRecord.concernRecord = [user.uid];
                    return updateMessage(messageUuid, messageRecord, false); 
                }
            }
        } else {
            return null;
        }
    });        
}

function getHappyAndSad(messageUuid, user) {
    const db = firebase.firestore();
    let collectionRef = db.collection(config.messageDB).doc(messageUuid).collection(config.userAction);
    if(user != null && collectionRef) {
        return collectionRef.doc(user.uid).get().then(function(doc) {
            if(doc.exists) {
                let userAction = doc.data();
                let rv = 0;
                if(userAction.happAndSad != null) {
                    rv = userAction.happAndSad;
                }
                return rv;
            } else {
                return 0;
            }
        });
    } else {
        return 0
        ;
    } 
}

function setHappyAndSad(messageUuid, happyCount, sadCount, happAndSad, user) {
    if(user == null) {
        return null;
    }
    const db = firebase.firestore();
    const messageCollectionRef = db.collection(config.messageDB);
    const messageRef = messageCollectionRef.doc(messageUuid);
    const userActionRef = messageRef.collection(config.userAction).doc(user.uid);
    return db.runTransaction(transaction => {
      return transaction.get(userActionRef).then(actionDoc => {
        if(actionDoc.exists) {
            transaction.update(userActionRef, {
                happAndSad: happAndSad
            });            
        } else {
            transaction.set(userActionRef, {
                happAndSad: happAndSad
            });            
        }
        transaction.update(messageRef, {
            happyCount: happyCount,
            sadCount: sadCount,
        });
      });
    });
}

/// All about comment
function addComment(messageUUID, currentUser, userProfile, photo, commentText, tags, geolocation, streetAddress, link, status) {
    var now = Date.now();
    var fireBaseGeo = null;

    var photoUrl = currentUser.providerData[0].photoURL || '/images/profile_placeholder.png';
    if(userProfile.photoURL != null) {
        photoUrl = userProfile.photoURL;
    }
    var displayName = currentUser.displayName;
    if(userProfile.displayName != null) {
        displayName = userProfile.displayName;
    }

    var commentRecord = {
        hide: false,
        name: displayName,
        uid: currentUser.uid,
        photoUrl: photoUrl,
        createdAt: new Date(now),
        lastUpdate: null,
    }; 
    if(commentText != null) {
        commentRecord.text = commentText;
    } else {
        if(geolocation != null) {
            commentRecord.geolocation =  new firebase.firestore.GeoPoint(geolocation.latitude, geolocation.longitude);
            if(streetAddress != null) {
                commentRecord.streetAddress = streetAddress;
            }
        } else {
            if(status != null) {
                commentRecord.changeStatus = status;
            } else {
                if(link != null) {
                    commentRecord.link = link;
                } else {
                    if(tags != null) {
                        commentRecord.tags = tags;
                    }
                }
            }
        }
    }
    console.log(commentRecord);
    // Use firestore
    const db = firebase.firestore();
    
    
    var collectionRef = db.collection(config.messageDB);  
    return collectionRef.doc(messageUUID).collection(config.commentDB).add(commentRecord).then(function(docRef) {
        return getMessage(messageUUID).then((messageRecord) => {
            return updateMessage(messageUUID, messageRecord, true);
        });
    });  
}

function updateCommentApproveStatus(messageUUID, commentid, approvedStatus){
    const db = firebase.firestore();
    
    
    let collectionRef = db.collection(config.messageDB);  
    let field = {approvedStatus: approvedStatus};
    return collectionRef.doc(messageUUID).collection(config.commentDB).doc(commentid).update(field).then(function(commentRecordRef) {
        console.log("Document written with ID: ", commentid);
        return(commentRecordRef);
    })
}

function fetchCommentsBaseonMessageID(user, messageUUID, callback) {
    const db = firebase.firestore();
    
    
    var collectionRef = db.collection(config.messageDB).doc(messageUUID).collection(config.commentDB);
    collectionRef.onSnapshot(function() {})         
    // Use firestore
    collectionRef.where("hide", "==", false).get().then(function(querySnapshot) {
        querySnapshot.forEach(callback);
    })
    .catch(function(error) {
        console.log("Error getting documents: ", error);
    });
}


export {getHappyAndSad, setHappyAndSad, upgradeAllMessage, incMessageViewCount, updateCommentApproveStatus, dropMessage, fetchCommentsBaseonMessageID, addComment, fetchMessagesBaseOnGeo, addMessage, updateMessageImageURL, getMessage, updateMessage, updateMessageConcernUser};
