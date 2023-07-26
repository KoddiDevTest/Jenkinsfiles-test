import os
from slack_sdk import WebClient
from datetime import datetime, timedelta, date
import requests
import json
import logging
logging.basicConfig(level=logging.DEBUG)
from slack_sdk.errors import SlackApiError

schedule_id = os.environ.get('ON_CALL_SCHEDULE_ID')
slack_bot_token = os.environ.get('SLACK_BOT_TOKEN')
pager_duty_token = os.environ.get('PAGER_DUTY_TOKEN')
dev_on_call_tag_id = os.environ.get('DEV_ON_CALL_TAG_ID')

def get_on_call_time_range():
    today = date(2023, 7, 31)
    upcoming_tuesday = today + timedelta(days=1)
    last_sunday = today - timedelta(days=1)

    print(last_sunday.strftime('%Y-%m-%d'), upcoming_tuesday.strftime('%Y-%m-%d'))

    return last_sunday.strftime('%Y-%m-%d'), upcoming_tuesday.strftime('%Y-%m-%d')
def get_on_call_users():
    since, until = get_on_call_time_range()

    url = f"https://api.pagerduty.com/schedules/{schedule_id}"

    querystring = {"time_zone": "America/Chicago", "since": since, "until": until}

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/vnd.pagerduty+json;version=2",
        "Authorization": "Token token=" + pager_duty_token
    }

    response = requests.request("GET", url, headers=headers, params=querystring)
    on_call_schedule = response.json()['schedule']['final_schedule']["rendered_schedule_entries"]
    previous_on_call_user_id = on_call_schedule[0]["user"]["id"]
    new_on_call_user_id = on_call_schedule[1]["user"]["id"]

    new_on_call_user_email = get_user_email_by_id(new_on_call_user_id)
    previous_on_call_user_email = get_user_email_by_id(previous_on_call_user_id)

    new_on_call_slack_user = get_slack_user_by_email(new_on_call_user_email)
    previous_on_call_slack_user = get_slack_user_by_email(previous_on_call_user_email)

    return new_on_call_slack_user, previous_on_call_slack_user


def get_user_email_by_id(user_id):
    url = f"https://api.pagerduty.com/users/{user_id}/contact_methods"

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/vnd.pagerduty+json;version=2",
        "Authorization": "Token token=" + pager_duty_token
    }

    response = requests.request("GET", url, headers=headers)

    return response.json()['contact_methods'][0]['address']


def get_slack_user_by_email(email):
    client = WebClient(token=slack_bot_token)
    try:
        response = client.users_lookupByEmail(
            email=email
        )

        return response['user']['id']
    except SlackApiError as e:
        assert e.response["error"]

def change_slack_tag(user):
    client = WebClient(token=slack_bot_token)
    try:
        response = client.usergroups_users_update(
            usergroup=dev_on_call_tag_id,
            users=[user]
        )
    except SlackApiError as e:
        assert e.response["error"]

def send_slack_msg(user, prev_user):
    client = WebClient(token=slack_bot_token)
    try:
        response = client.chat_postMessage(
            channel=user,
            text=f"Happy Monday! You are on call this week! Please make sure to sync with <@{prev_user}> for update ~ GOOD LUCK!! :meow_wobble: \n",
            as_user=True
        )
    except SlackApiError as e:
        assert e.response["error"]

def main():
    new_on_call_user, prev_on_call_user = get_on_call_users()
    send_slack_msg(new_on_call_user, prev_on_call_user)
    change_slack_tag(new_on_call_user)


if __name__ == "__main__":
    main()
