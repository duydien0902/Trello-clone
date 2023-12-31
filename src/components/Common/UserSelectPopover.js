import React, { useEffect, useState } from 'react'
import UserAvatar from 'components/Common/UserAvatar'
import { USER_SELECT_POPOVER_TYPE_CARD_MEMBERS, CARD_MEMBERS_ACTION_PUSH, CARD_MEMBERS_ACTION_REMOVE } from 'utilities/constants'
import { cloneDeep } from 'lodash'

function UserSelectPopover({ label, users=[], cardMemberIds, type, beforeUpdateCardMembers }) {
  const [showPopover, setShowPopover] = useState(false)
  const [remakeUsers, setRemakeUsers] = useState([])

  useEffect(() => {
    if (Array.isArray(users) &&
     Array.isArray(cardMemberIds) &&
     type === USER_SELECT_POPOVER_TYPE_CARD_MEMBERS)
    {
      let newUsers = cloneDeep(users)
      newUsers.forEach(user => {
        if (cardMemberIds.includes(user._id)) {
          user['c_selected'] = true
        }
      })
      setRemakeUsers(newUsers)
    } else {
      setRemakeUsers(users)
    }
  }, [cardMemberIds, type, users])

  const toggleShowPopOver = () => {
    setShowPopover(!showPopover)
  }

  const handleClickUser = (user) => {
    if (type === USER_SELECT_POPOVER_TYPE_CARD_MEMBERS) {
      let action = CARD_MEMBERS_ACTION_PUSH
      if (user.c_selected) action = CARD_MEMBERS_ACTION_REMOVE
      beforeUpdateCardMembers(user._id, action)
    }
  }

  return (
    <div className="users__select">
      <div className="users__select__content" onClick={toggleShowPopOver}>
        {label ? label : <i className="fa fa-plus" />}
      </div>
      {showPopover &&
        <div className="users__select__popover">
          <span className="users__select__popover__close_btn" onClick={toggleShowPopOver}>
            <i className="fa fa-close" />
          </span>
          <div className="title mb-2 text-center">Board members</div>
          <div className="users-list">
            {remakeUsers.map((u, index) => (
              <div
                className={`user ${u.c_selected ? 'selected' : ''}`}
                key={index}
                onClick={() => handleClickUser(u)}
              >
                <UserAvatar
                  user={u}
                  width="28px"
                  height="28px"
                  fontSize="14px"
                />
              </div>
            ))}
          </div>
        </div>
      }
    </div>
  )
}

export default UserSelectPopover
