const {PREFIX} = require(`./config.json`);
const Discord = require(`discord.js`);
const {formatDate} = require('./event');
const gcal = require('./GCal');

module.exports ={
    name: "edit",
    aliases: [""],
    description: "change an existing event's properties",
    syntax:
        `${PREFIX}edit cal: [name], event: [name], option: [property], edit: [change]` + "\n" +
        `***Date*** ***format***: [MM/DD] or [Day(Mon, Tues, ...)]` + "\n" +
        `***Time*** ***format***: [HH:mm] or [hh:mm:pm/am]`+ "\n" +
        `__**Properties**__ : [edit format]:`+ "\n" +
            `***start***: [date]-[time]` + "\n" +
            `***end***: [date]-[time]` + "\n" +
            `***startend***: [date]-[time] (makes start and end the same time)` + "\n" +
            `***description***: [string without commas]` + "\n" +
            `***location***: [string without commas]` + "\n" +
            `***name***: [changes event name without commas]` +
        "```Examples: \n" + `${PREFIX}edit cal: Some Calendar, event: Some Event, option: start, edit: friday-8:00:pm\n` +
        `${PREFIX}edit cal: Another Calendar, event: Event2, option: description, edit: this description can have spaces and any character EXCEPT for commas` +
        "```",

    // formats an error message as an embed
    ErrorMessage(error){
        // let i = 1;
        // for(const s of this.syntax){
        //     syntaxEmbed.addField(`Option ${i}` , s);
        //     i++;
        // }
        return new Discord.MessageEmbed()
            .setTitle("Error: " + error)
            .setColor("#00FFFF")
            .addField("Formatting Options: ", this.syntax);
    },
    // parses given parameter using RegEx and returns match
    getParam(args, param){
        let regex = new RegExp(`${param}:( ?)(.*?)([,]|$)`, 'i');
        try {
            return args.match(regex)[2];
        } catch (e) {
            return null;
        }
    },

    async run(message, args) {
        // parse required parameters
        const joined = args.join(" ");
        let calName = this.getParam(joined, "cal");
        let eventName = this.getParam(joined, "event");
        let option = this.getParam(joined, "option");
        let edit = this.getParam(joined, "edit");

        // check for missing parameters and send error message
        let errorMessage = "";
        if(!calName){
            errorMessage += "cal: [name], ";
        }
        if(!eventName){
            errorMessage += "event: [name], "
        }
        if(!option){
            errorMessage += "option: [property], "
        }
        if(!edit){
            errorMessage += "edit: [change], "
        }
        if(errorMessage.length !== 0 ){
            message.channel.send("Missing parameter: " + errorMessage);
            return;
        }

        // get calID using roleID from server
        const calID = gcal.gcalmap.get(message.guild.roles.cache.find(role => role.name === calName).id);
        const events = await gcal.getCalendarEvents(calID);
        let eventID;
        let eventObj; // gets copy of event object from google calendar
        for(const i of events.data.items){
            if(i.summary === eventName){
                eventID = i.id;
                eventObj = i;
                break;
            }
        }

        if(!eventID){
            message.channel.send(`Event '${eventName}' could not be found in '${calName}'`);
            return;
        }

        let resource; // to be sent to gAPI to update an event
        // changed only the property that was requested
        switch (option) {
            case "name":
                eventObj.summary = edit;
                break;
            case "start":
                let date = formatDate(edit, message.channel);
                if(!date){
                    message.channel.send("Error getting start date and time: [date]-[time]\n" +
                        `***Date*** ***format***: [MM/DD] or [Day(Mon, Tues, ...)]\n` +
                        `***Time*** ***format***: [HH:mm] or [hh:mm:pm/am]\n`);
                    return;
                }
                try { // if an event has a date and time
                    eventObj.start.dateTime = date;
                    eventObj.end.dateTime = new Date(eventObj.end.dateTime);
                } catch (e) { // only has a date
                    eventObj.start.date = date;
                    eventObj.end.date = new Date(eventObj.end.date);
                }
                break;
            case "end":
                let date1 = formatDate(edit, message.channel)
                if(!date1){
                    message.channel.send("Error getting start date and time: [date]-[time]\n" +
                        `***Date*** ***format***: [MM/DD] or [Day(Mon, Tues, ...)]\n` +
                        `***Time*** ***format***: [HH:mm] or [hh:mm:pm/am]\n`);
                    return;
                }
                try {
                    eventObj.start.dateTime = new Date(eventObj.end.dateTime);
                    eventObj.end.dateTime = date1;
                } catch (e) {
                    eventObj.start.date = new Date(eventObj.end.date);
                    eventObj.end.date = date1;
                }
                break;
            case "startend":
                let date2 = formatDate(edit, message.channel);
                if(!date2){
                    message.channel.send("Error getting start date and time: [date]-[time]\n" +
                        `***Date*** ***format***: [MM/DD] or [Day(Mon, Tues, ...)]\n` +
                        `***Time*** ***format***: [HH:mm] or [hh:mm:pm/am]\n`);
                    return;
                }
                try {
                    eventObj.start.dateTime = date2;
                    eventObj.end.dateTime = date2;
                } catch (e) {
                    eventObj.start.date = date2;
                    eventObj.end.date = date2;
                }
                break;
            case "description":
                eventObj.description = edit;
                break;
            case "location":
                eventObj.location = edit;
                break;
            default:
                message.channel.send(this.ErrorMessage("Invalid Property"));
                break;
        }

        // send request to gAPI to update an event
        let account = gcal.getAccount();
        account.events.update({
            calendarId: calID,
            eventId: eventID,
            resource: eventObj
        }).then(res => message.react("👍"));
    }
}