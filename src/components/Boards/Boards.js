import React, { useEffect, useState } from 'react'
import {
  Container as BootstrapContainer,
  Row, Col, ListGroup, Card, Form
} from 'react-bootstrap'
import CustomPagination from 'components/Common/Pagination'
import './Boards.scss'
import CreateNewBoardModal from './CreateNewBoardModal'
import { fetchBoardsAPI, createNewBoardAPI } from 'actions/ApiCall'
import LoadingSpinner from 'components/Common/LoadingSpinner'
import { isEmpty } from 'lodash'
import { useSearchParams, createSearchParams, Link } from 'react-router-dom'
import { useDebounce } from 'components/customHooks/useDebounce'

function Boards () {
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false)
  const [boards, setBoards] = useState(null)
  const [totalBoards, setTotalBoards] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {

    const searchPach = `?${createSearchParams(searchParams)}`

    fetchBoardsAPI(searchPach).then(res => {
      setBoards(res.boards)
      setTotalBoards(res.totalBoards)
    })
  }, [searchParams])

  const onPageChange = (selectedPage, itemsPerPage) => {
    setSearchParams({
      ...Object.fromEntries([...searchParams]), // lấy đúng toàn bộ những param trên ULR
      //sau đó chúng ta mới cập nhất lại dữu liêuj mới
      currentPage: selectedPage,
      itemsPerPage
    })
  }

  const debounceSearchBoard = useDebounce(
    (e) => {
      const searchTerm = e.target?.value
      setSearchParams({
        ...Object.fromEntries([...searchParams]), // lấy đúng toàn bộ những param trên ULR
        //sau đó chúng ta mới cập nhất lại dữu liêuj mới
        'q[title]': searchTerm
      })
    },
    1000
  )

  const createNewBoard = async (boardData) => {
    try {
      //B1: tạo mới một cái board
      await createNewBoardAPI(boardData)

      //B2: fetch lại danh sách boards
      const searchPach = `?${createSearchParams(searchParams)}`
      const res = await fetchBoardsAPI(searchPach)

      setBoards(res.boards)
      setTotalBoards(res.totalBoards)

    } catch (error) {
      return error
    }
  }

  return (
    <BootstrapContainer>
      <CreateNewBoardModal
        show={showCreateBoardModal}
        onClose={() => setShowCreateBoardModal(false)}
        onCreateNewBoard={createNewBoard}
      />
      <Row>
        <Col md={3} className="mt-5">
          <div className="boards__navigation">
            <div className="boards__heading">Navigation</div>
            <ListGroup variant="flush" className="boards__menu">
              <ListGroup.Item action active><i className="fa fa-columns icon" /> Boards</ListGroup.Item>
              <ListGroup.Item action><i className="fa fa-globe icon" /> Templates</ListGroup.Item>
              <ListGroup.Item action><i className="fa fa-home icon" /> Home</ListGroup.Item>
              <hr/>
              <ListGroup.Item action variant="success" onClick={() => setShowCreateBoardModal(true)}>
                <i className="fa fa-plus-square-o icon" /> Create new board
              </ListGroup.Item>
              <hr/>
              <ListGroup.Item className="p-0">
                <Form className="common__form">
                  <Form.Control
                    size="sm"
                    type="text"
                    placeholder="Search boards..."
                    onChange={debounceSearchBoard}
                  />
                </Form>
              </ListGroup.Item>
            </ListGroup>
          </div>
        </Col>
        <Col md={9} className="mt-5">
          {!boards
            ? <LoadingSpinner caption="Loading board..." />
            : isEmpty(boards)
              ? <div> No boards  found!</div>
              : <>
                <div className="grid__boards">
                  <div className="boards__heading">Your boards:</div>
                  <Row xs={1} md={2} lg={3} className="g-4">
                    {boards.map(b => (
                      <Col key={b._id}>
                        <Card as={Link} to={`/b/${b._id}`} className="text-decoration-none" >
                          <Card.Body>
                            <Card.Title className="card__title">{b.title}</Card.Title>
                            <Card.Text className="card__description">{b.description}</Card.Text>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
                <CustomPagination
                  totalItems={totalBoards}
                  currentPage={searchParams.get('currentPage') || 1}
                  onPageChange={onPageChange}
                />
              </>
          }
        </Col>
      </Row>
    </BootstrapContainer>
  )
}

export default Boards
