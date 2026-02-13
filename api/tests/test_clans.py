import pytest
import pytest_asyncio
from models.user import User
from utils.token_manager import TokenManager


@pytest.mark.asyncio
async def test_create_clan_sufficient_xp(client, regular_user, db_session):
    regular_user["user"].xp = 1250
    await db_session.commit()
    client.cookies.set("access_token", regular_user["token"])
    response = await client.post("/clans", json={"name": "test", "tag": "test"})
    assert response.status_code == 200
    assert "id" in response.json()


@pytest.mark.asyncio
async def test_get_all_clans_public(client, clan):
    response = await client.get("/clans/all")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_my_clan_as_member(client, regular_user, clan):
    client.cookies.set("access_token", regular_user["token"])
    response = await client.get("/clans")
    assert response.status_code == 200
    assert "id" in response.json()


@pytest.mark.asyncio
async def test_get_other_clan_details(client, regular_user, clan):
    client.cookies.set("access_token", regular_user["token"])
    response = await client.get(f"/clans/{clan.id}")
    assert response.status_code == 200
    assert response.json()["id"] == clan.id


@pytest.mark.asyncio
async def test_update_clan_as_owner(client, regular_user, clan):
    client.cookies.set("access_token", regular_user["token"])
    response = await client.patch("/clans", json={"name": "UpdatedClan", "tag": "UPD", "description": "updated"})
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_delete_clan_as_owner(client, regular_user, clan):
    client.cookies.set("access_token", regular_user["token"])
    response = await client.delete("/clans")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_create_invite_as_admin(client, regular_user, clan):
    client.cookies.set("access_token", regular_user["token"])
    response = await client.post("/clans/invite")
    assert response.status_code == 200
    assert "code" in response.json()


@pytest.mark.asyncio
async def test_join_clan_valid_invite(client, regular_user, clan_invite, db_session):
    regular_user["user"].clan_id = 0
    regular_user["user"].clan_role = "none"
    client.cookies.set("access_token", regular_user["token"])
    response = await client.post(f"/clans/join?invite_code={clan_invite.code}")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_leave_clan_as_member(client, regular_user, clan):
    regular_user["user"].clan_role = "member"
    client.cookies.set("access_token", regular_user["token"])
    response = await client.post("/clans/leave")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_kick_member_as_admin(client, high_xp_user, clan, db_session):
    high_xp_user["user"].clan_id = clan.id
    high_xp_user["user"].clan_role = "admin"
    victim = User(
        username="victim",
        google_id="victim_gid",
        name="Victim",
        clan_id=clan.id,
        clan_role="member",
    )
    db_session.add(victim)
    await db_session.flush()
    clan.members = clan.members + [high_xp_user["user"].id, victim.id]
    await db_session.commit()
    client.cookies.set("access_token", high_xp_user["token"])
    response = await client.delete(f"/clans/kick/{victim.id}")
    assert response.status_code == 200
