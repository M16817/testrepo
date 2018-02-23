/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector);
bot.set('storage', tableStorage);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

// const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;
const LuisModelUrl = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/cd348e87-a0b8-42b4-8f2e-e2231f74b912?subscription-key=c34de313ca30408f8b470551879d97cc&staging=true&verbose=true&timezoneOffset=330&q="

// Main dialog with LUIS

var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var inMemoryStorage = new builder.MemoryBotStorage();

var intents = new builder.IntentDialog({ recognizers: [recognizer] })

.matches('Welcome',[
     //
      
      function(session){
        session.send('Welcome to Hotel booking bot, I may help you with hotel booking and booking cancellation, How may I help you today ?');
           session.beginDialog('displaymainCategory');
      },
      
      function(session,results){
          console.log('\n category : '+ JSON.stringify(results));
            session.dialogData.maincategory=results.response;
            session.beginDialog('askforcheckindt');   
      },
      
      function(session,results){
            console.log('\n store chekin dt : '+ JSON.stringify(results));
            session.dialogData.chekindt=builder.EntityRecognizer.resolveTime([results.response]);
            session.beginDialog('askfrochkoutdt');        
      },
      
      function(session,results){
          console.log('\n all booking info :' + JSON.stringify(results));
          session.dialogData.chekoutdt=builder.EntityRecognizer.resolveTime([results.response]);       
           session.send(`Your entered information : <br/>Checkin Date/Time: ${session.dialogData.chekindt} <br/>Checkout Date/Time: ${session.dialogData.chekoutdt} <br/>`);
           session.beginDialog('showhotels');
           //session.endDialog();
      },
      
      function(session,results){
          // console.log('gdg '+JSON.stringify(results));
          // session.dialogData.Hotelinfo=results.response;
          // console.log('go to ask personal details');
          //console.log("Nilesh");
          //session.beginDialog('Personaldetails');
      },
      
      function(session,results){
          console.log('mobile number is : '+ results.response);
      
          //last time change comment this if else
          if(results.response.length=10){
          session.dialogData.mobno=results.response;
          session.beginDialog('Bookedconfirmation');    
          }
          else
          {
          session.beginDialog('Personaldetails');    
          }
          
          //last time change uncomment this if else
          // session.dialogData.mobno=results.response;
          // session.beginDialog('Bookedconfirmation');
      },
      
    function(session, results) {
    session.userData.confirm = results.response;
    console.log('value is go to this : ' + session.userData.confirm);
    if(session.userData.confirm){
       session.send('Booking is done successful and confirmation message is sent on your mobile number.'+session.dialogData.mobno)
    } else {
        session.userData = {};
        session.send(`Booking cancelled`);   
    }    
    session.endDialog();
      },
      
      // function(session,results){
        //   console.log(session.response);
        //   session.beginDialog('Bookedconfirmation');
        //   session.dialogData.mobno=session.response;
        //   session.send('Your Selected hotel is bokked');
        //   //session.endDialog();
      // }
      
      // function(session,result){
        //   
      // }     
])

.matches('Help', (session) => {
    session.send('You reached Help intent, you said \'%s\'.', session.message.text);
})
.matches('Cancel', (session) => {
    session.send('You reached Cancel intent, you said \'%s\'.', session.message.text);
})
/*
.matches('<yourIntent>')... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/
*/
.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});


bot.dialog('displaymainCategory',[
    function(session){
        builder.Prompts.choice(session,'Select One Category from below',['Book Hotel','Cancel Booking'],{listStyle:2});       
    },
    function(session,result){
        session.endDialogWithResult(result);
    }
    ]);

bot.dialog('askforcheckindt',[
    function(session){
        builder.Prompts.time(session,'What is your checkin date in hotel ?');
    },
    function(session,result){
        session.endDialogWithResult(result);
    }
]);

bot.dialog('askfrochkoutdt',[
    function(session){
    builder.Prompts.time(session,'What is your checkout date in hotel ?');
    },
    function(session,result){
        session.endDialogWithResult(result);
    }
]);

bot.dialog('showhotels', [
    function(session){
    var msg = new builder.Message(session);
    msg.attachmentLayout(builder.AttachmentLayout.carousel)
    msg.attachments([
    new builder.ThumbnailCard(session)
    .title("Hotel Taj")
    .subtitle("Mumbai")
    .text("Price is 9,500")
    .images([builder.CardImage.create(session,'https://taj.tajhotels.com/content/dam/luxury/hotels/Taj_Mahal_Mumbai/images/3x2/R&S_31160076-H1-TajClubRoom2-3x2(1).jpg.enscale.threeColumnOffer.full.high.jpg')])
    .buttons([
    builder.CardAction.imBack(session, "Book", "Book")
    ]),
    new builder.ThumbnailCard(session)
    .title("Hotel Oberoy")
    .subtitle("Fort, Mumbai")
    .text("Price is 7,000")
    .images([builder.CardImage.create(session,'https://ui.cltpstatic.com/places/hotels/4100/41000/images/presidential_suite_Bathroom_w.jpg')])
    .buttons([
    builder.CardAction.imBack(session, "Book", "Book")
    ]),
    new builder.ThumbnailCard(session)
    .title("Hotel IBIS")
    .subtitle("Navi Mumbai")
    .text("Price is 5,000")
    .images([builder.CardImage.create(session,'https://exp.cdn-hotels.com/hotels/6000000/5070000/5067300/5067283/bc216492_z.jpg')])
    .buttons([
        builder.CardAction.imBack(session,"Book","Book")
        ])
    ]);
        session.send(msg).endDialog();
        
    }]);
   

bot.dialog('Book',[
    function(session){
        session.sendTyping();
        builder.Prompts.text(session,'Please Enter Yours Mobile Number ?');
    },
    function(session,results){
        console.log('chek mob no : '+ results.response.length);
        if(results.response.length===10){
            session.userData.mobno=results.response;
        console.log('mobile no is ok '+session.dialogData.mobno); 
        //session.endDialogWithResult(results);
        session.beginDialog('Bookedconfirmation');
        console.log('lenght ' +results.response.length);
        }
        else{
            session.replaceDialog('Book',{reprompt : true});
        }
    }
]).triggerAction({ matches: /^(Book|list)/i });

 
bot.dialog('Bookedconfirmation',[
    function(session){
        session.sendTyping();
        
        builder.Prompts.confirm(session,"Please Confirm your booking");
    },
    function(session,results){
        session.userData.confirm = results.response;
        //session.dialogData.bmobile=session.dialogData.mobno;
        session.beginDialog('Bookedmsg');
    }
]); 

bot.dialog('Bookedmsg',[
    function(session,results){
       // session.userData.confirm = JSON.stringify(results) //.response;
    if(session.userData.confirm){
        console.log('dialog', session.userData.mobno);
       session.send('Booking is done successful and confirmation message is sent on your mobile number.'+session.userData.mobno);
       session.endDialog();
    } else {
        //session.userData = {};
        session.send(`Booking cancelled`);   
    }
    }        
]);
    
    
    
bot.dialog('/', intents);    
